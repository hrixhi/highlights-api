import { htmlStringParser } from '@helper/HTMLParser';
import Expo from 'expo-server-sdk';
import { Arg, Field, ObjectType } from 'type-graphql';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { DateModel } from '../dates/mongo/dates.model';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserModel } from '../user/mongo/User.model';
import { AttendanceModel } from './mongo/attendance.model';
import * as OneSignal from 'onesignal-node';
import { ActivityModel } from '../activity/mongo/activity.model';
import { NewAttendanceEntryInput } from './input-types/NewAttendanceEntryInput.type';
import { AttendanceEntryModel } from '../attendance-entries/mongo/AttendanceEntry.model';

/**
 * Attendance Mutation Endpoints
 */
@ObjectType()
export class AttendanceMutationResolver {
    @Field((type) => Boolean, {
        description: 'Used when you want to create new meeting.',
    })
    public async create(
        @Arg('channelId', (type) => String) channelId: string,
        @Arg('start', (type) => String) start: string,
        @Arg('end', (type) => String) end: string
    ) {
        try {
            await DateModel.create({
                start: new Date(start),
                end: new Date(end),
                title: 'Scheduled Call',
                scheduledMeetingForChannelId: channelId,
            });
            const messages: any[] = [];
            const userIds: any[] = [];

            const subscriptions = await SubscriptionModel.find({
                $and: [{ channelId }, { unsubscribedAt: { $exists: false } }],
            });
            subscriptions.map((s) => {
                userIds.push(s.userId);
            });
            const channel: any = await ChannelModel.findById(channelId);
            const users: any[] = await UserModel.find({ _id: { $in: userIds } });

            // Web notifications

            const oneSignalClient = new OneSignal.Client(
                '78cd253e-262d-4517-a710-8719abf3ee55',
                'YTNlNWE2MGYtZjdmMi00ZjlmLWIzNmQtMTE1MzJiMmFmYzA5'
            );

            const notification = {
                contents: {
                    en: `${channel.name}` + ' - New Meeting Scheduled',
                },
                include_external_user_ids: userIds,
            };

            if (userIds.length > 0) {
                const response = await oneSignalClient.createNotification(notification);
            }

            users.map((sub) => {
                const notificationIds = sub.notificationId.split('-BREAK-');
                notificationIds.map((notifId: any) => {
                    if (!Expo.isExpoPushToken(notifId)) {
                        return;
                    }
                    messages.push({
                        to: notifId,
                        sound: 'default',
                        subtitle: 'Your instructor has scheduled a new meeting.',
                        title: channel.name + ' - New Meeting Scheduled',
                        data: { userId: sub._id },
                    });
                });
            });
            const notificationService = new Expo();
            let chunks = notificationService.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try {
                    await notificationService.sendPushNotificationsAsync(chunk);
                } catch (e) {
                    console.error(e);
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to mark as class start.',
    })
    public async markAttendance(
        @Arg('userId', (type) => String) userId: string,
        @Arg('channelId', (type) => String) channelId: string
    ) {
        try {
            // What if user joins 2 minutes before start time.... to do
            // Subtract 10 minutes from start to capture attendance
            const current = new Date();
            // const minus10 = new Date(current.getTime() - (1000 * 60 * 10))
            const plus10 = new Date(current.getTime() + 1000 * 60 * 10);
            // If meeting from 10:00 to 11:00
            // Try to join at 9:55 then look for start date less than 10:05, therefore captured
            const date = await DateModel.findOne({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: channelId,
                start: { $lte: plus10 },
                end: { $gte: current },
            });
            if (date) {
                const att = await AttendanceModel.findOne({
                    userId,
                    dateId: date._id,
                    channelId,
                });
                if (!att) {
                    await AttendanceModel.create({
                        userId,
                        dateId: date._id,
                        joinedAt: new Date(),
                        channelId,
                    });
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to mark as class start.',
    })
    public async modifyAttendance(
        @Arg('dateId', (type) => String) dateId: string,
        @Arg('userId', (type) => String) userId: string,
        @Arg('channelId', (type) => String) channelId: string,
        @Arg('markPresent', (type) => Boolean) markPresent: boolean
    ) {
        try {
            if (markPresent) {
                const att = await AttendanceModel.findOne({
                    userId,
                    dateId,
                    channelId,
                });
                if (!att) {
                    await AttendanceModel.create({
                        userId,
                        dateId: dateId,
                        channelId,
                    });
                }
            } else {
                const att = await AttendanceModel.findOne({
                    userId,
                    dateId,
                    channelId,
                });
                if (att) {
                    await AttendanceModel.deleteOne({
                        _id: att._id,
                    });
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to create new meeting.',
    })
    public async createEntry(
        @Arg('attendanceEntryInput', (type) => NewAttendanceEntryInput) attendanceEntryInput: NewAttendanceEntryInput
    ) {
        try {
            const { title, date, recordingLink, channelId, attendances } = attendanceEntryInput;

            const createAttendanceEntry = await AttendanceEntryModel.create({
                title,
                date,
                recordingLink,
                channelId,
            });

            if (!createAttendanceEntry) {
                return false;
            }

            //
            const entries = attendances.map((att: any) => {
                return {
                    attendanceEntryId: createAttendanceEntry._id,
                    userId: att.userId,
                    attendanceType: att.attendanceType,
                    late: att.late,
                    excused: att.excused,
                    channelId,
                };
            });

            const createAttendances = await AttendanceModel.insertMany(entries);

            return true;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async editEntry(
        @Arg('attendanceEntryInput', (type) => NewAttendanceEntryInput) attendanceEntryInput: NewAttendanceEntryInput,
        @Arg('entryId', (type) => String) entryId: string,
        @Arg('attendanceBookEntry', (type) => Boolean) attendanceBookEntry: boolean
    ) {
        try {
            const { title, date, recordingLink, channelId, attendances } = attendanceEntryInput;

            if (attendanceBookEntry) {
                // First update the entry
                await AttendanceEntryModel.updateOne(
                    {
                        _id: entryId,
                    },
                    {
                        title,
                        date,
                        recordingLink,
                    }
                );

                const getAttendances = await AttendanceModel.find({
                    attendanceEntryId: entryId,
                });

                for (let i = 0; i < getAttendances.length; i++) {
                    const attendance = getAttendances[i];

                    const findAttendance = attendances.find((x: any) => x.userId === attendance.userId.toString());

                    if (findAttendance) {
                        const updateAttendance = await AttendanceModel.updateOne(
                            {
                                _id: attendance._id,
                            },
                            {
                                attendanceType: findAttendance.attendanceType,
                                late: findAttendance.late,
                                excused: findAttendance.excused,
                            }
                        );

                        console.log('updateAttendance', updateAttendance.nModified > 0);
                    }
                }

                const newEntries: any[] = [];

                // Check
                for (let i = 0; i < attendances.length; i++) {
                    // Check if entry already exist
                    const findAttendance = getAttendances.find(
                        (x: any) => x.toObject().userId.toString() === attendances[i].userId
                    );

                    // Create the o
                    if (!findAttendance) {
                        newEntries.push(attendances[i]);
                    }
                }

                console.log('New entries', newEntries);

                const entries = newEntries.map((att: any) => {
                    return {
                        attendanceEntryId: entryId,
                        userId: att.userId,
                        attendanceType: att.attendanceType,
                        late: att.late,
                        excused: att.excused,
                        channelId,
                    };
                });

                if (newEntries.length > 0) {
                    await AttendanceModel.insertMany(entries);
                }
            } else {
                // First update the entry
                await DateModel.updateOne(
                    {
                        _id: entryId,
                    },
                    {
                        title,
                        start: date,
                        recordingLink,
                    }
                );

                const getAttendances = await AttendanceModel.find({
                    dateId: entryId,
                });

                for (let i = 0; i < getAttendances.length; i++) {
                    const attendance = getAttendances[i];

                    const findAttendance = attendances.find((x: any) => x.userId === attendance.userId.toString());

                    if (findAttendance) {
                        const updateAttendance = await AttendanceModel.updateOne(
                            {
                                _id: attendance._id,
                            },
                            {
                                attendanceType: findAttendance.attendanceType,
                                late: findAttendance.late,
                                excused: findAttendance.excused,
                            }
                        );

                        console.log('updateAttendance', updateAttendance.nModified > 0);
                    }
                }

                const newEntries: any[] = [];

                // Check
                for (let i = 0; i < attendances.length; i++) {
                    // Check if entry already exist
                    const findAttendance = getAttendances.find(
                        (x: any) => x.toObject().userId.toString() === attendances[i].userId
                    );

                    // Create the o
                    if (!findAttendance) {
                        newEntries.push(attendances[i]);
                    }
                }

                console.log('New entries', newEntries);

                const entries = newEntries.map((att: any) => {
                    return {
                        dateId: entryId,
                        userId: att.userId,
                        attendanceType: att.attendanceType,
                        late: att.late,
                        excused: att.excused,
                        channelId,
                    };
                });

                if (newEntries.length > 0) {
                    await AttendanceModel.insertMany(entries);
                }
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async deleteEntry(
        @Arg('entryId', (type) => String) entryId: string,
        @Arg('attendanceBookEntry', (type) => Boolean) attendanceBookEntry: boolean
    ) {
        try {
            if (attendanceBookEntry) {
                // First delete the attendance entry
                const deleteAttendance = await AttendanceEntryModel.deleteOne({
                    _id: entryId,
                });

                // Delete all user attendances
                const deleteUserAttendances = await AttendanceModel.deleteMany({
                    attendanceEntryId: entryId,
                });
            } else {
                // First delete the attendance entry
                const deleteAttendance = await DateModel.deleteOne({
                    _id: entryId,
                });

                // Delete all user attendances
                const deleteUserAttendances = await AttendanceModel.deleteMany({
                    dateId: entryId,
                });
            }

            // Return
            return true;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Used to update entry directly from the gradebook',
    })
    public async handleUpdateAttendanceBookEntry(
        @Arg('userId', (type) => String) userId: string,
        @Arg('entryId', (type) => String) entryId: string,
        @Arg('attendanceEntry', (type) => Boolean) attendanceEntry: boolean,
        @Arg('attendanceType', (type) => String) attendanceType: string,
        @Arg('late', (type) => Boolean) late: boolean,
        @Arg('excused', (type) => Boolean) excused: boolean,
        @Arg('channelId', (type) => String) channelId: string
    ) {
        try {
            if (attendanceEntry) {
                //
                const findAttendance = await AttendanceModel.findOne({
                    attendanceEntryId: entryId,
                    userId,
                });

                if (findAttendance) {
                    const updateAttendance = await AttendanceModel.updateOne(
                        {
                            attendanceEntryId: entryId,
                            userId,
                        },
                        {
                            attendanceType,
                            late: attendanceType === 'present' ? late : false,
                            excused: attendanceType === 'absent' ? excused : false,
                        }
                    );

                    return true;
                } else {
                    const createAttendanceEntry = await AttendanceModel.create({
                        attendanceEntryId: entryId,
                        userId,
                        attendanceType,
                        late: attendanceType === 'present' ? late : false,
                        excused: attendanceType === 'absent' ? excused : false,
                        channelId,
                    });

                    if (createAttendanceEntry) return true;
                }
            } else {
                const findAttendance = await AttendanceModel.findOne({
                    dateId: entryId,
                    userId,
                });

                if (findAttendance) {
                    const updateAttendance = await AttendanceModel.updateOne(
                        {
                            dateId: entryId,
                            userId,
                        },
                        {
                            attendanceType,
                            late: attendanceType === 'present' ? late : false,
                            excused: attendanceType === 'absent' ? excused : false,
                        }
                    );

                    return true;
                } else {
                    const createAttendanceEntry = await AttendanceModel.create({
                        dateId: entryId,
                        userId,
                        attendanceType,
                        late: attendanceType === 'present' ? late : false,
                        excused: attendanceType === 'absent' ? excused : false,
                        channelId,
                    });

                    if (createAttendanceEntry) return true;
                }
            }

            return false;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }
}
