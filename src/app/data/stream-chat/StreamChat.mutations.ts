import { Arg, Field, ObjectType } from 'type-graphql';
import { UserModel } from '../user/mongo/User.model';
import { StreamChat } from 'stream-chat';
import { SchoolsModel } from '../school/mongo/School.model';
import { zoomClientId, zoomClientSecret } from '../../../helpers/zoomCredentials';
import axios from 'axios';
import moment from 'moment';
import { DateModel } from '../dates/mongo/dates.model';
import { StreamChatMeetingObject } from './types/StreamChatMeeting.type';

const API_KEY = 'fa2jhu3kqpah';
const API_SECRET = 'vt9u5pp227pqb29jjnc669a743h7df9k9gu9xwbtnccxgy6a58xx389dt2zj6ptd';

@ObjectType()
export class StreamChatMutationResolver {
    @Field((type) => String, {
        description:
            'Subscribes to a channel & returns "error" or "subscribed" or "incorrect-password" or "your-channel" or "already-subbed".',
    })
    public async getUserToken(@Arg('userId', (type) => String) userId: string) {
        try {
            const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

            const fetchUser = await UserModel.findById(userId);

            if (!fetchUser) return '';

            if (fetchUser && fetchUser.streamToken) {
                return fetchUser.streamToken;
            } else {
                const user = fetchUser.toObject();

                let schoolId = user.schoolId?.toString() ? user.schoolId?.toString() : '';

                // UPSERT USER
                await serverClient.upsertUser({
                    id: user._id.toString(),
                    name: user.fullName,
                    image: user.avatar,
                    email: user.email,
                    cues_role: user.role,
                    cues_grade: user.role === 'student' ? user.grade : undefined,
                    cues_section: user.role === 'student' ? user.section : undefined,
                    schoolId: user.schoolId?.toString(),
                    teams: [schoolId],
                });

                // Automatic expiration for chat user
                const token = serverClient.createToken(user._id.toString());

                const updateUser = await UserModel.updateOne(
                    {
                        _id: user._id,
                    },
                    {
                        streamToken: token,
                    }
                );

                return token;
            }
        } catch (e) {
            console.log('Error', e);
            return '';
        }
    }

    @Field((type) => String, {
        description:
            'Subscribes to a channel & returns "error" or "subscribed" or "incorrect-password" or "your-channel" or "already-subbed".',
    })
    public async regenUserToken(@Arg('userId', (type) => String) userId: string) {
        try {
            const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

            const fetchUser = await UserModel.findById(userId);

            if (!fetchUser) return '';

            // Upsert User to update
            const user = fetchUser.toObject();

            let schoolId = user.schoolId?.toString() ? user.schoolId?.toString() : '';

            // UPSERT USER
            await serverClient.upsertUser({
                id: user._id.toString(),
                name: user.fullName,
                image: user.avatar,
                email: user.email,
                cues_role: user.role,
                cues_grade: user.role === 'student' ? user.grade : undefined,
                cues_section: user.role === 'student' ? user.section : undefined,
                schoolId: user.schoolId?.toString(),
                teams: [schoolId],
            });

            // Automatic expiration for chat user
            const token = serverClient.createToken(user._id.toString());

            const updateUser = await UserModel.updateOne(
                {
                    _id: user._id,
                },
                {
                    streamToken: token,
                }
            );

            return token;
        } catch (e) {
            console.log('Error', e);
            return '';
        }
    }

    @Field((type) => Boolean, {
        description: 'Register users to Stream.',
    })
    public async registerSchoolUsers(@Arg('schoolId', (type) => String) schoolId: string) {
        try {
            const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

            // MAKE IT MULTI_TENANT
            await serverClient.updateAppSettings({
                multi_tenant_enabled: true,
            });

            const fetchSchoolUsers = await UserModel.find({
                schoolId,
                deletedAt: undefined,
                inactive: { $ne: true },
            });

            for (let i = 0; i < fetchSchoolUsers.length; i++) {
                const user = fetchSchoolUsers[i].toObject();

                // UPSERT USER
                await serverClient.upsertUser({
                    id: user._id.toString(),
                    name: user.fullName,
                    image: user.avatar,
                    email: user.email,
                    cues_role: user.role,
                    cues_grade: user.role === 'student' ? user.grade : undefined,
                    cues_section: user.role === 'student' ? user.section : undefined,
                    schoolId: user.schoolId?.toString(),
                    teams: [schoolId],
                });
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Register users to Stream.',
    })
    public async registerSchoolParents(@Arg('schoolId', (type) => String) schoolId: string) {
        try {
            const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

            const fetchSchoolStudents = await UserModel.find({
                role: 'student',
                schoolId,
                deletedAt: undefined,
                inactive: { $ne: true },
            });

            const parentIds = new Set();

            const parentsMap: any = [];

            // Build directory User object for each
            for (let i = 0; i < fetchSchoolStudents.length; i++) {
                const user = fetchSchoolStudents[i].toObject();

                // CONSTRUCT PARENTS IF USER IS INSTRUCTOR

                if (user.parent1) {
                    parentIds.add(user.parent1._id.toString());

                    if (parentsMap[user.parent1._id.toString()]) {
                        const updateIds = [...parentsMap[user.parent1._id.toString()]];
                        //
                        updateIds.push({
                            fullName: user.fullName,
                            grade: user.grade,
                            section: user.section,
                        });
                        parentsMap[user.parent1._id.toString()] = updateIds;
                    } else {
                        parentsMap[user.parent1._id.toString()] = [
                            {
                                fullName: user.fullName,
                                grade: user.grade,
                                section: user.section,
                            },
                        ];
                    }
                }

                if (user.parent2) {
                    parentIds.add(user.parent2._id.toString());

                    if (parentsMap[user.parent2._id.toString()]) {
                        const updateIds = [...parentsMap[user.parent2._id.toString()]];
                        //
                        updateIds.push({
                            fullName: user.fullName,
                            grade: user.grade,
                            section: user.section,
                        });
                        parentsMap[user.parent2._id.toString()] = updateIds;
                    } else {
                        parentsMap[user.parent2._id.toString()] = [
                            {
                                fullName: user.fullName,
                                grade: user.grade,
                                section: user.section,
                            },
                        ];
                    }
                }
            }

            console.log('Parents', Array.from(parentIds));

            const updateParents = await UserModel.updateMany(
                {
                    _id: { $in: Array.from(parentIds) },
                },
                {
                    parentSchoolIds: [schoolId],
                }
            );

            const fetchParents = await UserModel.find({
                _id: { $in: Array.from(parentIds) },
                deletedAt: undefined,
                inactive: { $ne: true },
            });

            for (let i = 0; i < fetchParents.length; i++) {
                const user = fetchParents[i].toObject();

                // UPSERT USER
                await serverClient.upsertUser({
                    id: user._id.toString(),
                    name: user.fullName,
                    image: user.avatar,
                    email: user.email,
                    cues_role: user.role,
                    teams: [schoolId],
                });
            }

            return true;
        } catch (e) {
            console.log('error', e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Remove users for an org.',
    })
    public async deleteUsers(@Arg('schoolId', (type) => String) schoolId: string) {
        try {
            const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

            const fetchSchoolUsers = await UserModel.find({
                schoolId,
            });

            const userIds = fetchSchoolUsers.map((user: any) => user._id.toString());

            const deleteUsers = serverClient.deleteUsers(userIds, {
                user: 'hard',
                messages: 'hard',
                conversations: 'hard',
            });

            return true;
        } catch (e) {
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Remove users for an org.',
    })
    public async toggleAdminRole(
        @Arg('groupId', (type) => String) groupId: string,
        @Arg('userId', (type) => String) userId: string,
        @Arg('alreadyAdmin', (type) => Boolean) alreadyAdmin: boolean
    ) {
        try {
            const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

            const channel = await serverClient.channel('messaging', groupId);

            console.log('Channel', channel);

            if (alreadyAdmin) {
                await channel.demoteModerators([userId]);
            } else {
                const res = await channel.addModerators([userId]);
                console.log('Res', res);
            }

            return true;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Register users to Stream.',
    })
    public async deleteChannelPermanently(@Arg('groupId', (type) => String) groupId: string) {
        try {
            const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

            const channel = await serverClient.channel('messaging', groupId);

            console.log('Channel', channel);

            const response = await channel.delete();

            return true;
        } catch (e) {
            console.log('error', e);
            return false;
        }
    }

    @Field((type) => Boolean, {
        description: 'Register users to Stream.',
    })
    public async addModerators(
        @Arg('groupId', (type) => String) groupId: string,
        @Arg('moderators', (type) => [String]) moderators: string[]
    ) {
        try {
            const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

            const channel = await serverClient.channel('messaging', groupId);

            await channel.addModerators(moderators);

            return true;
        } catch (e) {
            console.log('error', e);
            return false;
        }
    }

    @Field((type) => StreamChatMeetingObject, {
        description: 'Used when you want to create/join a meeting.',
        nullable: true,
    })
    public async startChatMeeting(
        @Arg('userId', (type) => String) userId: string,
        @Arg('topic', (type) => String)
        topic: string,
        @Arg('start', (type) => String) start: string,
        @Arg('end', (type) => String) end: string,
        @Arg('groupId', (type) => String)
        groupId: string
    ) {
        try {
            const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);

            const diff = Math.abs(new Date(start).getTime() - new Date(end).getTime());

            const duration = Math.round(diff / 60000);

            let accessToken = '';
            const u: any = await UserModel.findById(userId);

            if (u && groupId !== '') {
                const user = u.toObject();

                let useZoom = true;

                if (user.schoolId && user.schoolId !== '') {
                    const org = await SchoolsModel.findById(user.schoolId);

                    if (org && org.meetingProvider && org.meetingProvider !== '') {
                        useZoom = false;
                    }
                }

                if (useZoom) {
                    if (!user.zoomInfo) {
                        return null;
                    } else {
                        accessToken = user.zoomInfo.accessToken;
                    }

                    const b = Buffer.from(zoomClientId + ':' + zoomClientSecret);

                    const date = new Date();
                    const expiresOn = new Date(user.zoomInfo.expiresOn);

                    if (expiresOn <= date) {
                        // refresh access token

                        const zoomRes: any = await axios.post(
                            `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${user.zoomInfo.refreshToken}`,
                            undefined,
                            {
                                headers: {
                                    Authorization: `Basic ${b.toString('base64')}`,
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                },
                            }
                        );

                        if (zoomRes.status !== 200) {
                            return null;
                        }

                        const zoomData: any = zoomRes.data;

                        const eOn = new Date();
                        eOn.setSeconds(
                            eOn.getSeconds() +
                                (Number.isNaN(Number(zoomData.expires_in)) ? 0 : Number(zoomData.expires_in))
                        );

                        accessToken = zoomData.access_token;

                        await UserModel.updateOne(
                            { _id: userId },
                            {
                                zoomInfo: {
                                    ...user.zoomInfo,
                                    accessToken: zoomData.access_token,
                                    refreshToken: zoomData.refresh_token,
                                    expiresOn: eOn, // saved as a date
                                },
                            }
                        );
                    }

                    const fetchChannel = await serverClient.channel('messaging', groupId);

                    const members = Object.values(fetchChannel.state.members || {}).filter(
                        (member) => member.user?.id !== userId
                    );

                    // CREATE MEETING
                    const utcTime = moment(new Date(start), 'YYYY-MM-DDTHH:mm:ss')
                        .tz('UTC')
                        .format();

                    // create meeting
                    const zoomRes: any = await axios.post(
                        `https://api.zoom.us/v2/users/me/meetings`,
                        {
                            topic:
                                topic && topic !== ''
                                    ? topic
                                    : 'Meeting with ' +
                                      (fetchChannel.data && fetchChannel.data.name
                                          ? fetchChannel.data.name
                                          : members[0].user?.name),
                            agenda: '',
                            type: 2,
                            start_time: utcTime + 'Z',
                            duration,
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                            },
                        }
                    );

                    if (zoomRes.status !== 200 && zoomRes.status !== 201) {
                        return null;
                    }

                    const zoomData: any = zoomRes.data;

                    if (zoomData.id) {
                        // Schedule a meeting with the group
                        await DateModel.create({
                            userId,
                            title: topic,
                            start: new Date(start),
                            end: new Date(end),
                            isNonMeetingChannelEvent: undefined,
                            scheduledMeetingForChannelId: undefined,
                            description: '',
                            zoomMeetingId: zoomData.id,
                            zoomStartUrl: zoomData.start_url,
                            zoomJoinUrl: zoomData.join_url,
                            zoomMeetingScheduledBy: userId,
                            isNonChannelMeeting: true,
                            nonChannelGroupId: groupId,
                        });
                    } else {
                        return null;
                    }

                    return {
                        title: topic,
                        meetingId: zoomData.id,
                        meetingProvider: 'zoom',
                        meetingStartLink: zoomData.start_url,
                        meetingJoinLink: zoomData.join_url,
                        start,
                        end,
                    };
                }
            }
            return null;
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }
}
