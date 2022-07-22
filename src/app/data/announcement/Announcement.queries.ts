import { Arg, Field, ObjectType } from 'type-graphql';
import { AnnouncementModel } from './mongo/announcement.model';
import { AnnouncementObject } from './types/announcement.type';

/**
 * Announcement Query Endpoints
 */
@ObjectType()
export class AnnouncementQueryResolver {
    @Field((type) => [AnnouncementObject], {
        description: 'Used to find one user by id.',
    })
    public async getAnnouncementsAdmin(
        @Arg('userId', (type) => String)
        userId: string,
        @Arg('schoolId', (type) => String)
        schoolId: string,
        @Arg('skips', (type) => Number)
        skips: number,
        @Arg('limit', (type) => Number)
        limit: number
    ) {
        try {
            return await AnnouncementModel.find({
                $or: [
                    { userId, schoolId },
                    {
                        $and: [
                            { schoolId },
                            { $or: [{ shareWithAllAdmins: true }, { selectedAdmins: { $in: [userId] } }] },
                        ],
                    },
                ],
            })
                .sort({
                    createdAt: -1,
                })
                .skip(skips * limit)
                .limit(limit);
        } catch (e) {
            console.log(e);
            return [];
        }
    }
}
