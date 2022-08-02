import { Arg, Field, ObjectType } from 'type-graphql';
import { DirectoryUserObject } from '../school/types/DirectoryUser.type';
import { SubscriptionModel } from '../subscription/mongo/Subscription.model';
import { UserModel } from '../user/mongo/User.model';

/**
 * Stream Chat Query Resolver
 */
@ObjectType()
export class StreamChatQueryResolver {
    @Field((type) => [DirectoryUserObject], {
        description: 'Used to retrieve school by userId',
        nullable: true,
    })
    public async getInboxDirectory(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const fetchUser = await UserModel.findById(userId);

            if (!fetchUser) return null;

            let directory: any[] = [];

            if (fetchUser.role === 'student' || fetchUser.role === 'instructor') {
                // Constructor directory based on courses
                const subscriptions = await SubscriptionModel.find({
                    userId,
                    unsubscribedAt: undefined,
                });

                //
                const subscriptionMap: any = {};

                const directoryUserIds = new Set();

                // Build Subscriber map
                for (let i = 0; i < subscriptions.length; i++) {
                    const sub = subscriptions[i];

                    // Subscribers of that specific channel
                    const subUsers = await SubscriptionModel.find({
                        channelId: sub.channelId,
                        userId: { $ne: userId },
                    });

                    for (let j = 0; j < subUsers.length; j++) {
                        const channelMember = subUsers[j];

                        if (subscriptionMap[channelMember.userId.toString()]) {
                            const updateIds = [...subscriptionMap[channelMember.userId.toString()]];
                            updateIds.push(channelMember.channelId.toString());
                            subscriptionMap[channelMember.userId.toString()] = updateIds;
                        } else {
                            subscriptionMap[channelMember.userId.toString()] = [channelMember.channelId.toString()];
                        }
                    }

                    directoryUserIds.add(sub.userId.toString());
                }

                const instructorRoles = ['student', 'instructor', 'admin'];
                const studentRoles = ['student', 'instructor', 'admin'];

                const fetchDirectoryUsers = await UserModel.find({
                    $and: [
                        {
                            $or: [
                                { _id: { $in: Array.from(directoryUserIds) } },
                                {
                                    role: { $in: fetchUser.role === 'student' ? studentRoles : instructorRoles },
                                },
                            ],
                        },
                        {
                            _id: { $ne: userId },
                            deletedAt: undefined,
                            inactive: { $ne: true },
                            schoolId: fetchUser.schoolId,
                        },
                    ],
                });

                const parentIds = new Set();

                const parentsMap: any = [];

                // Build directory User object for each
                for (let i = 0; i < fetchDirectoryUsers.length; i++) {
                    const user = fetchDirectoryUsers[i].toObject();

                    // CONSTRUCT PARENTS IF USER IS INSTRUCTOR
                    if (user.role === 'student' && fetchUser.role === 'instructor') {
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

                    directory.push({
                        _id: user._id,
                        fullName: user.fullName,
                        avatar: user.avatar,
                        role: user.role,
                        grade: user.grade,
                        section: user.section,
                        roleDescription:
                            user.role === 'student' ? 'Student, ' + user.grade + '-' + user.section : 'Intructor',
                        courses: subscriptionMap[user._id.toString()] ? subscriptionMap[user._id.toString()] : [],
                    });
                }

                console.log('Parents', Array.from(parentIds));

                const fetchParents = await UserModel.find({
                    _id: { $in: Array.from(parentIds) },
                    deletedAt: undefined,
                    inactive: { $ne: true },
                });

                for (let i = 0; i < fetchParents.length; i++) {
                    const parent = fetchParents[i].toObject();

                    const getChildren = parentsMap[parent._id.toString()];

                    for (let j = 0; j < getChildren.length; j++) {
                        const child = getChildren[j];

                        directory.push({
                            _id: parent._id,
                            fullName: parent.fullName,
                            avatar: parent.avatar,
                            role: parent.role,
                            grade: child.grade,
                            section: child.section,
                            roleDescription: 'Parent of ' + child.fullName + ` (${child.grade}, ${child.section})`,
                            courses: [],
                        });
                    }
                }

                directory.sort((a: any, b: any) => {
                    return a.fullName > b.fullName ? 1 : -1;
                });

                return directory;
            }

            return null;
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }

    @Field((type) => [DirectoryUserObject], {
        description: 'Used to retrieve school by userId',
        nullable: true,
    })
    public async getInboxDirectoryAdmin(
        @Arg('userId', (type) => String)
        userId: string
    ) {
        try {
            const fetchUser = await UserModel.findById(userId);

            if (!fetchUser) return null;

            let directory: any[] = [];

            const fetchDirectoryUsers = await UserModel.find({
                $and: [
                    {
                        role: { $in: ['student', 'instructor', 'admin'] },
                    },
                    {
                        _id: { $ne: userId },
                        deletedAt: undefined,
                        inactive: { $ne: true },
                        schoolId: fetchUser.schoolId,
                    },
                ],
            });

            const parentIds = new Set();

            const parentsMap: any = [];

            // Build directory User object for each
            for (let i = 0; i < fetchDirectoryUsers.length; i++) {
                const user = fetchDirectoryUsers[i].toObject();

                let subscriptions;

                // CONSTRUCT PARENTS IF USER IS INSTRUCTOR
                if (user.role === 'student') {
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

                    const fetchActiveSubscriptions = await SubscriptionModel.find({
                        userId: user._id,
                        unsubscribedAt: undefined,
                    });

                    subscriptions = fetchActiveSubscriptions.map((sub: any) => sub.channelId);
                }

                if (user.role === 'instructor') {
                    const fetchActiveSubscriptions = await SubscriptionModel.find({
                        userId: user._id,
                        unsubscribedAt: undefined,
                    });

                    subscriptions = fetchActiveSubscriptions.map((sub: any) => sub.channelId);
                }

                directory.push({
                    _id: user._id,
                    fullName: user.fullName,
                    avatar: user.avatar,
                    role: user.role,
                    grade: user.grade,
                    section: user.section,
                    roleDescription:
                        user.role === 'student' ? 'Student, ' + user.grade + '-' + user.section : 'Intructor',
                    courses: subscriptions ? subscriptions : [],
                });
            }

            console.log('Parents', Array.from(parentIds));

            const fetchParents = await UserModel.find({
                _id: { $in: Array.from(parentIds) },
                deletedAt: undefined,
                inactive: { $ne: true },
            });

            for (let i = 0; i < fetchParents.length; i++) {
                const parent = fetchParents[i].toObject();

                const getChildren = parentsMap[parent._id.toString()];

                for (let j = 0; j < getChildren.length; j++) {
                    const child = getChildren[j];

                    directory.push({
                        _id: parent._id,
                        fullName: parent.fullName,
                        avatar: parent.avatar,
                        role: parent.role,
                        grade: child.grade,
                        section: child.section,
                        roleDescription: 'Parent of ' + child.fullName + ` (${child.grade}, ${child.section})`,
                        courses: [],
                    });
                }
            }

            directory.sort((a: any, b: any) => {
                return a.fullName > b.fullName ? 1 : -1;
            });

            return directory;
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }
}
