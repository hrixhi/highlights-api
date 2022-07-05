import { Arg, Field, ObjectType } from 'type-graphql';
import { DateModel } from '../dates/mongo/dates.model';
import { EventObject } from '../dates/types/Date.type';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { AttendanceModel } from './mongo/attendance.model';
import { AttendanceObject } from './types/Attendance.type';
import { ChannelAttendanceObject } from './types/ChannelAttendance.type';
import { UserModel } from '../user/mongo/User.model';
import { ChannelModel } from '../channel/mongo/Channel.model';
import { AttendanceEntryModel } from '../attendance-entries/mongo/AttendanceEntry.model';
import { AttendanceBookObject } from './types/AttendanceBookObject.type';
import { AttendanceBookStudentObject } from './types/AttendanceBookStudentObject.type';

/**
 * Attendance Query Endpoints
 */
@ObjectType()
export class AttendanceQueryResolver {
    @Field((type) => [EventObject], {
        description: 'Returns list of upcoming dates.',
        nullable: true,
    })
    public async getUpcomingDates(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            return await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: channelId,
                end: { $gt: new Date() },
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [EventObject], {
        description: 'Returns list of past dates.',
        nullable: true,
    })
    public async getPastDates(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const toReturn: any[] = [];
            const dates = await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: channelId,
                end: { $lte: new Date() },
            });
            dates.map((d: any) => {
                const date = d.toObject();
                toReturn.push({
                    ...date,
                    dateId: date._id,
                });
            });
            return toReturn;
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [AttendanceObject], {
        description: 'Returns list of attendances.',
        nullable: true,
    })
    public async getAttendances(
        @Arg('dateId', (type) => String)
        dateId: string
    ) {
        try {
            return await AttendanceModel.find({
                dateId,
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [AttendanceObject], {
        description: 'Returns a list of Attendances for a user for all channels',
        nullable: true,
    })
    public async getAttendancesByUser(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            return await AttendanceModel.find({
                userId,
            });
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field((type) => [ChannelAttendanceObject], {
        description: 'Returns a list of Attendances for  past dates',
        nullable: true,
    })
    public async getAttendancesForChannel(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            const channel: any = await ChannelModel.findById(channelId);

            let owners: any[] = [];

            if (channel) {
                owners = channel.owners
                    ? [...channel.owners, channel.createdBy.toString()]
                    : [channel.createdBy.toString()];
            }

            const channelSubscriptions: any[] = await SubscriptionModel.find({
                channelId,
                deletedAt: null,
            });

            const userIds: string[] = channelSubscriptions.map((sub) => sub.userId);

            const filteredUserIds: string[] = userIds.filter((userId) => !owners.includes(userId.toString()));

            const channelUsers: any[] = await UserModel.find({ _id: { $in: filteredUserIds } });

            const attendanceObject: any = {};

            const attendanceData: any = await AttendanceModel.find({
                channelId,
            });

            attendanceData.map((att: any) => {
                const attendance = att.toObject();
                if (attendanceObject[attendance.userId]) {
                    attendanceObject[attendance.userId].push({
                        userId: attendance.userId,
                        dateId: attendance.dateId,
                        joinedAt: attendance.joinedAt,
                    });
                } else {
                    attendanceObject[attendance.userId] = [
                        {
                            userId: attendance.userId,
                            dateId: attendance.dateId,
                            joinedAt: attendance.joinedAt,
                        },
                    ];
                }
            });

            const channelAttendance: any[] = [];

            channelUsers.map((u: any) => {
                const user = u.toObject();
                channelAttendance.push({
                    userId: user._id,
                    displayName: user.displayName,
                    fullName: user.fullName,
                    email: user.email && user.email !== '' ? user.email : '',
                    avatar: user.avatar && user.avatar !== '' ? user.avatar : '',
                    attendances: attendanceObject[user._id] ? attendanceObject[user._id] : [],
                });
            });

            return channelAttendance;
        } catch (e) {
            return [];
        }
    }

    @Field((type) => AttendanceBookObject, {
        description: 'Returns a list of Attendances for  past dates',
        nullable: true,
    })
    public async getAttendanceBook(
        @Arg('channelId', (type) => String)
        channelId: string
    ) {
        try {
            var numDaysBetween = function(d1: Date, d2: Date) {
                var diff = Math.abs(d1.getTime() - d2.getTime());
                return diff / (1000 * 60 * 60 * 24);
            };

            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel) return null;

            let owners: any[] = [];

            owners = fetchChannel.owners
                ? [...fetchChannel.owners, fetchChannel.createdBy.toString()]
                : [fetchChannel.createdBy.toString()];

            const activeSubscribers = await SubscriptionModel.find({
                channelId,
                unsubscribedAt: undefined,
            });

            const studentIds: string[] = [];

            activeSubscribers.map((sub: any) => {
                if (!owners.includes(sub.userId.toString())) {
                    studentIds.push(sub.userId.toString());
                }
            });

            const channelEvents: any[] = [];

            // First all dates
            const pastDates = await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: channelId,
                end: { $lte: new Date() },
            });

            for (let i = 0; i < pastDates.length; i++) {
                const date = pastDates[i];

                channelEvents.push({
                    title: date.title,
                    start: date.start,
                    end: date.end,
                    dateId: date._id,
                    recordingLink: date.recordingLink,
                });
            }

            // Next get all entries
            const attendanceEntries = await AttendanceEntryModel.find({
                channelId,
            });

            for (let i = 0; i < attendanceEntries.length; i++) {
                const entry = attendanceEntries[i];

                channelEvents.push({
                    title: entry.title,
                    start: entry.date,
                    end: undefined,
                    attendanceEntryId: entry._id,
                    recordingLink: entry.recordingLink,
                });
            }

            const eventsWithAttendances: any[] = [];

            let attendancesTotalPossible = 0;
            let attendancesLast30TotalPossible = 0;
            let attendancesLast7TotalPossible = 0;

            // PRESENT
            const attendancesPresentMap: any = {};

            const attendancesLast30PresentMap: any = {};

            const attendancesLast7PresentMap: any = {};

            // LATE
            const attendancesLateMap: any = {};

            const attendancesLast30LateMap: any = {};

            const attendancesLast7LateMap: any = {};

            // TOTAL EXCUSED
            const attendancesTotalExcusedMap: any = {};

            const attendancesLast30TotalExcusedMap: any = {};

            const attendancesLast7TotalExcusedMap: any = {};

            // Construct attendances
            for (let i = 0; i < channelEvents.length; i++) {
                const event = channelEvents[i];

                const eventDate = event.start;

                attendancesTotalPossible += 1;

                // THIS WEEK
                if (numDaysBetween(eventDate, new Date()) < 7) {
                    attendancesLast7TotalPossible += 1;
                }

                if (numDaysBetween(eventDate, new Date()) < 30) {
                    attendancesLast30TotalPossible += 1;
                }

                if (event.dateId) {
                    // Fetch Attendanes Objects
                    const fetchEventAttendances = await AttendanceModel.find({
                        dateId: event.dateId,
                    });

                    let attendances: any[] = [];

                    for (let j = 0; j < studentIds.length; j++) {
                        const userId = studentIds[j];

                        const findAttendance = fetchEventAttendances.find((att: any) => {
                            return att.userId.toString() === userId;
                        });

                        let isPresent = false;
                        let isLate = false;
                        let isExcused = false;

                        if (findAttendance) {
                            attendances.push({
                                userId,
                                attendanceType: findAttendance.attendanceType
                                    ? findAttendance.attendanceType
                                    : 'present',
                                late: findAttendance.late ? findAttendance.late : false,
                                excused: findAttendance.excused ? findAttendance.excused : false,
                                joinedAt: findAttendance.joinedAt ? findAttendance.joinedAt : undefined,
                            });

                            if (findAttendance.attendanceType === 'present') {
                                isPresent = true;
                            }

                            if (findAttendance.attendanceType === 'present' && findAttendance.late) {
                                isLate = true;
                            }

                            if (findAttendance.attendanceType === 'absent' && findAttendance.excused) {
                                isExcused = true;
                            }
                        } else {
                            attendances.push({
                                userId,
                                attendanceType: 'absent',
                                late: false,
                                excused: false,
                                joinedAt: undefined,
                            });
                        }

                        if (isPresent) {
                            if (attendancesPresentMap[userId]) {
                                attendancesPresentMap[userId] += 1;
                            } else {
                                attendancesPresentMap[userId] = 1;
                            }
                        }

                        if (isLate) {
                            if (attendancesLateMap[userId]) {
                                attendancesLateMap[userId] += 1;
                            } else {
                                attendancesLateMap[userId] = 1;
                            }
                        }

                        if (isExcused) {
                            if (attendancesTotalExcusedMap[userId]) {
                                attendancesTotalExcusedMap[userId] += 1;
                            } else {
                                attendancesTotalExcusedMap[userId] = 1;
                            }
                        }

                        if (numDaysBetween(eventDate, new Date()) < 7) {
                            if (isPresent) {
                                if (attendancesLast7PresentMap[userId]) {
                                    attendancesLast7PresentMap[userId] += 1;
                                } else {
                                    attendancesLast7PresentMap[userId] = 1;
                                }
                            }

                            if (isLate) {
                                if (attendancesLast7LateMap[userId]) {
                                    attendancesLast7LateMap[userId] += 1;
                                } else {
                                    attendancesLast7LateMap[userId] = 1;
                                }
                            }

                            if (isExcused) {
                                if (attendancesLast7TotalExcusedMap[userId]) {
                                    attendancesLast7TotalExcusedMap[userId] += 1;
                                } else {
                                    attendancesLast7TotalExcusedMap[userId] = 1;
                                }
                            }
                        }

                        if (numDaysBetween(eventDate, new Date()) < 30) {
                            if (isPresent) {
                                if (attendancesLast30PresentMap[userId]) {
                                    attendancesLast30PresentMap[userId] += 1;
                                } else {
                                    attendancesLast30PresentMap[userId] = 1;
                                }
                            }

                            if (isLate) {
                                if (attendancesLast30LateMap[userId]) {
                                    attendancesLast30LateMap[userId] += 1;
                                } else {
                                    attendancesLast30LateMap[userId] = 1;
                                }
                            }

                            if (isExcused) {
                                if (attendancesLast30TotalExcusedMap[userId]) {
                                    attendancesLast30TotalExcusedMap[userId] += 1;
                                } else {
                                    attendancesLast30TotalExcusedMap[userId] = 1;
                                }
                            }
                        }
                    }

                    eventsWithAttendances.push({
                        ...event,
                        attendances,
                    });
                } else {
                    // Fetch Attendanes Objects
                    const fetchEventAttendances = await AttendanceModel.find({
                        attendanceEntryId: event.attendanceEntryId,
                    });

                    let attendances: any[] = [];

                    for (let j = 0; j < studentIds.length; j++) {
                        const userId = studentIds[j];

                        const findAttendance = fetchEventAttendances.find((att: any) => {
                            return att.userId.toString() === userId;
                        });

                        let isPresent = false;
                        let isLate = false;
                        let isExcused = false;

                        if (findAttendance) {
                            attendances.push({
                                userId,
                                attendanceType: findAttendance.attendanceType
                                    ? findAttendance.attendanceType
                                    : 'present',
                                late: findAttendance.late ? findAttendance.late : false,
                                excused: findAttendance.excused ? findAttendance.excused : false,
                                joinedAt: findAttendance.joinedAt ? findAttendance.joinedAt : undefined,
                            });

                            if (findAttendance.attendanceType === 'present') {
                                isPresent = true;
                            }

                            if (findAttendance.attendanceType === 'present' && findAttendance.late) {
                                isLate = true;
                            }

                            if (findAttendance.attendanceType === 'absent' && findAttendance.excused) {
                                isExcused = true;
                            }
                        } else {
                            attendances.push({
                                userId,
                                attendanceType: 'absent',
                                late: false,
                                excused: false,
                                joinedAt: undefined,
                            });
                        }

                        if (isPresent) {
                            if (attendancesPresentMap[userId]) {
                                attendancesPresentMap[userId] += 1;
                            } else {
                                attendancesPresentMap[userId] = 1;
                            }
                        }

                        if (isLate) {
                            if (attendancesLateMap[userId]) {
                                attendancesLateMap[userId] += 1;
                            } else {
                                attendancesLateMap[userId] = 1;
                            }
                        }

                        if (isExcused) {
                            if (attendancesTotalExcusedMap[userId]) {
                                attendancesTotalExcusedMap[userId] += 1;
                            } else {
                                attendancesTotalExcusedMap[userId] = 1;
                            }
                        }

                        if (numDaysBetween(eventDate, new Date()) < 7) {
                            if (isPresent) {
                                if (attendancesLast7PresentMap[userId]) {
                                    attendancesLast7PresentMap[userId] += 1;
                                } else {
                                    attendancesLast7PresentMap[userId] = 1;
                                }
                            }

                            if (isLate) {
                                if (attendancesLast7LateMap[userId]) {
                                    attendancesLast7LateMap[userId] += 1;
                                } else {
                                    attendancesLast7LateMap[userId] = 1;
                                }
                            }

                            if (isExcused) {
                                if (attendancesLast7TotalExcusedMap[userId]) {
                                    attendancesLast7TotalExcusedMap[userId] += 1;
                                } else {
                                    attendancesLast7TotalExcusedMap[userId] = 1;
                                }
                            }
                        }

                        if (numDaysBetween(eventDate, new Date()) < 30) {
                            if (isPresent) {
                                if (attendancesLast30PresentMap[userId]) {
                                    attendancesLast30PresentMap[userId] += 1;
                                } else {
                                    attendancesLast30PresentMap[userId] = 1;
                                }
                            }

                            if (isLate) {
                                if (attendancesLast30LateMap[userId]) {
                                    attendancesLast30LateMap[userId] += 1;
                                } else {
                                    attendancesLast30LateMap[userId] = 1;
                                }
                            }

                            if (isExcused) {
                                if (attendancesLast30TotalExcusedMap[userId]) {
                                    attendancesLast30TotalExcusedMap[userId] += 1;
                                } else {
                                    attendancesLast30TotalExcusedMap[userId] = 1;
                                }
                            }
                        }
                    }

                    eventsWithAttendances.push({
                        ...event,
                        attendances,
                    });
                }
            }

            // Calculate totals for each user
            let totals: any[] = [];

            for (let i = 0; i < studentIds.length; i++) {
                const userId = studentIds[i];

                totals.push({
                    userId,
                    totalAttendancesPossible: attendancesTotalPossible,
                    totalPresent: attendancesPresentMap[userId] ? attendancesPresentMap[userId] : 0,
                    totalLate: attendancesLateMap[userId] ? attendancesLateMap[userId] : 0,
                    totalExcused: attendancesTotalExcusedMap[userId] ? attendancesTotalExcusedMap[userId] : 0,
                    last30AttendancesPossible: attendancesLast30TotalPossible,
                    last30Present: attendancesLast30PresentMap[userId] ? attendancesLast30PresentMap[userId] : 0,
                    last30Late: attendancesLast30LateMap[userId] ? attendancesLast30LateMap[userId] : 0,
                    last30TotalExcused: attendancesLast30TotalExcusedMap[userId]
                        ? attendancesLast30TotalExcusedMap[userId]
                        : 0,
                    last7AttendancesPossible: attendancesLast7TotalPossible,
                    last7Present: attendancesLast7PresentMap[userId] ? attendancesLast7PresentMap[userId] : 0,
                    last7Late: attendancesLast7LateMap[userId] ? attendancesLast7LateMap[userId] : 0,
                    last7TotalExcused: attendancesLast7TotalExcusedMap[userId]
                        ? attendancesLast7TotalExcusedMap[userId]
                        : 0,
                });
            }

            console.log('Totals', totals);

            const fetchUsers = await UserModel.find({
                _id: { $in: studentIds },
            });

            const users: any[] = [];

            fetchUsers.map((user) => {
                users.push({
                    userId: user._id,
                    fullName: user.fullName,
                    avatar: user.avatar,
                });
            });

            // Sort the assignments by Deadline
            eventsWithAttendances.sort((a: any, b: any) => {
                return a.start < b.start ? 1 : -1;
            });

            return {
                entries: eventsWithAttendances,
                totals,
                users,
            };
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }

    @Field((type) => AttendanceBookStudentObject, {
        description: 'Returns a list of Attendances for  past dates',
        nullable: true,
    })
    public async getAttendanceBookStudent(
        @Arg('channelId', (type) => String)
        channelId: string,
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            var numDaysBetween = function(d1: Date, d2: Date) {
                var diff = Math.abs(d1.getTime() - d2.getTime());
                return diff / (1000 * 60 * 60 * 24);
            };

            const fetchChannel = await ChannelModel.findById(channelId);

            if (!fetchChannel) return null;

            const channelEvents: any[] = [];

            // First all dates
            const pastDates = await DateModel.find({
                isNonMeetingChannelEvent: { $ne: true },
                scheduledMeetingForChannelId: channelId,
                end: { $lte: new Date() },
            });

            for (let i = 0; i < pastDates.length; i++) {
                const date = pastDates[i];

                channelEvents.push({
                    title: date.title,
                    start: date.start,
                    end: date.end,
                    dateId: date._id,
                    recordingLink: date.recordingLink,
                });
            }

            // Next get all entries
            const attendanceEntries = await AttendanceEntryModel.find({
                channelId,
            });

            for (let i = 0; i < attendanceEntries.length; i++) {
                const entry = attendanceEntries[i];

                channelEvents.push({
                    title: entry.title,
                    start: entry.date,
                    end: undefined,
                    attendanceEntryId: entry._id,
                    recordingLink: entry.recordingLink,
                });
            }

            const eventsWithAttendances: any[] = [];

            let attendancesTotalPossible = 0;
            let attendancesLast30TotalPossible = 0;
            let attendancesLast7TotalPossible = 0;

            // PRESENT
            let attendancesPresent = 0;

            let attendancesLast30Present = 0;

            let attendancesLast7Present = 0;

            // LATE
            let attendancesLate = 0;

            let attendancesLast30Late = 0;

            let attendancesLast7Late = 0;

            // TOTAL EXCUSED
            let attendancesTotalExcused = 0;

            let attendancesLast30TotalExcused = 0;

            let attendancesLast7TotalExcused = 0;

            // Construct attendances
            for (let i = 0; i < channelEvents.length; i++) {
                const event = channelEvents[i];

                const eventDate = event.start;

                attendancesTotalPossible += 1;

                // THIS WEEK
                if (numDaysBetween(eventDate, new Date()) < 7) {
                    attendancesLast7TotalPossible += 1;
                }

                if (numDaysBetween(eventDate, new Date()) < 30) {
                    attendancesLast30TotalPossible += 1;
                }

                if (event.dateId) {
                    // Fetch Attendanes Objects
                    const fetchEventAttendances = await AttendanceModel.find({
                        dateId: event.dateId,
                    });

                    const findAttendance = fetchEventAttendances.find((att: any) => {
                        return att.userId.toString() === userId;
                    });

                    let isPresent = false;
                    let isLate = false;
                    let isExcused = false;

                    if (findAttendance) {
                        eventsWithAttendances.push({
                            ...event,
                            attendanceType: findAttendance.attendanceType ? findAttendance.attendanceType : 'present',
                            late: findAttendance.late ? findAttendance.late : false,
                            excused: findAttendance.excused ? findAttendance.excused : false,
                            joinedAt: findAttendance.joinedAt ? findAttendance.joinedAt : undefined,
                        });

                        if (findAttendance.attendanceType === 'present') {
                            isPresent = true;
                        }

                        if (findAttendance.attendanceType === 'present' && findAttendance.late) {
                            isLate = true;
                        }

                        if (findAttendance.attendanceType === 'absent' && findAttendance.excused) {
                            isExcused = true;
                        }
                    } else {
                        eventsWithAttendances.push({
                            ...event,
                            attendanceType: 'absent',
                            late: false,
                            excused: false,
                            joinedAt: undefined,
                        });
                    }

                    if (isPresent) {
                        if (attendancesPresent) {
                            attendancesPresent += 1;
                        } else {
                            attendancesPresent = 1;
                        }
                    }

                    if (isLate) {
                        if (attendancesLate) {
                            attendancesLate += 1;
                        } else {
                            attendancesLate = 1;
                        }
                    }

                    if (isExcused) {
                        if (attendancesTotalExcused) {
                            attendancesTotalExcused += 1;
                        } else {
                            attendancesTotalExcused = 1;
                        }
                    }

                    if (numDaysBetween(eventDate, new Date()) < 7) {
                        if (isPresent) {
                            if (attendancesLast7Present) {
                                attendancesLast7Present += 1;
                            } else {
                                attendancesLast7Present = 1;
                            }
                        }

                        if (isLate) {
                            if (attendancesLast7Late) {
                                attendancesLast7Late += 1;
                            } else {
                                attendancesLast7Late = 1;
                            }
                        }

                        if (isExcused) {
                            if (attendancesLast7TotalExcused) {
                                attendancesLast7TotalExcused += 1;
                            } else {
                                attendancesLast7TotalExcused = 1;
                            }
                        }
                    }

                    if (numDaysBetween(eventDate, new Date()) < 30) {
                        if (isPresent) {
                            if (attendancesLast30Present) {
                                attendancesLast30Present += 1;
                            } else {
                                attendancesLast30Present = 1;
                            }
                        }

                        if (isLate) {
                            if (attendancesLast30Late) {
                                attendancesLast30Late += 1;
                            } else {
                                attendancesLast30Late = 1;
                            }
                        }

                        if (isExcused) {
                            if (attendancesLast30TotalExcused) {
                                attendancesLast30TotalExcused += 1;
                            } else {
                                attendancesLast30TotalExcused = 1;
                            }
                        }
                    }
                } else {
                    // Fetch Attendanes Objects
                    const fetchEventAttendances = await AttendanceModel.find({
                        attendanceEntryId: event.attendanceEntryId,
                    });

                    const findAttendance = fetchEventAttendances.find((att: any) => {
                        return att.userId.toString() === userId;
                    });

                    let isPresent = false;
                    let isLate = false;
                    let isExcused = false;

                    if (findAttendance) {
                        eventsWithAttendances.push({
                            ...event,
                            attendanceType: findAttendance.attendanceType ? findAttendance.attendanceType : 'present',
                            late: findAttendance.late ? findAttendance.late : false,
                            excused: findAttendance.excused ? findAttendance.excused : false,
                            joinedAt: findAttendance.joinedAt ? findAttendance.joinedAt : undefined,
                        });

                        if (findAttendance.attendanceType === 'present') {
                            isPresent = true;
                        }

                        if (findAttendance.attendanceType === 'present' && findAttendance.late) {
                            isLate = true;
                        }

                        if (findAttendance.attendanceType === 'absent' && findAttendance.excused) {
                            isExcused = true;
                        }
                    } else {
                        eventsWithAttendances.push({
                            ...event,
                            attendanceType: 'absent',
                            late: false,
                            excused: false,
                            joinedAt: undefined,
                        });
                    }

                    if (isPresent) {
                        if (attendancesPresent) {
                            attendancesPresent += 1;
                        } else {
                            attendancesPresent = 1;
                        }
                    }

                    if (isLate) {
                        if (attendancesLate) {
                            attendancesLate += 1;
                        } else {
                            attendancesLate = 1;
                        }
                    }

                    if (isExcused) {
                        if (attendancesTotalExcused) {
                            attendancesTotalExcused += 1;
                        } else {
                            attendancesTotalExcused = 1;
                        }
                    }

                    if (numDaysBetween(eventDate, new Date()) < 7) {
                        if (isPresent) {
                            if (attendancesLast7Present) {
                                attendancesLast7Present += 1;
                            } else {
                                attendancesLast7Present = 1;
                            }
                        }

                        if (isLate) {
                            if (attendancesLast7Late) {
                                attendancesLast7Late += 1;
                            } else {
                                attendancesLast7Late = 1;
                            }
                        }

                        if (isExcused) {
                            if (attendancesLast7TotalExcused) {
                                attendancesLast7TotalExcused += 1;
                            } else {
                                attendancesLast7TotalExcused = 1;
                            }
                        }
                    }

                    if (numDaysBetween(eventDate, new Date()) < 30) {
                        if (isPresent) {
                            if (attendancesLast30Present) {
                                attendancesLast30Present += 1;
                            } else {
                                attendancesLast30Present = 1;
                            }
                        }

                        if (isLate) {
                            if (attendancesLast30Late) {
                                attendancesLast30Late += 1;
                            } else {
                                attendancesLast30Late = 1;
                            }
                        }

                        if (isExcused) {
                            if (attendancesLast30TotalExcused) {
                                attendancesLast30TotalExcused += 1;
                            } else {
                                attendancesLast30TotalExcused = 1;
                            }
                        }
                    }
                }
            }

            // Calculate totals for each user
            let total = {
                totalAttendancesPossible: attendancesTotalPossible,
                totalPresent: attendancesPresent,
                totalLate: attendancesLate,
                totalExcused: attendancesTotalExcused,
                last30AttendancesPossible: attendancesLast30TotalPossible,
                last30Present: attendancesLast30Present,
                last30Late: attendancesLast30Late,
                last30TotalExcused: attendancesLast30TotalExcused,
                last7AttendancesPossible: attendancesLast7TotalPossible,
                last7Present: attendancesLast7Present,
                last7Late: attendancesLast7Late,
                last7TotalExcused: attendancesLast7TotalExcused,
            };

            // Sort the assignments by Deadline
            eventsWithAttendances.sort((a: any, b: any) => {
                return a.start < b.start ? 1 : -1;
            });

            return {
                entries: eventsWithAttendances,
                total,
            };
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }
}
