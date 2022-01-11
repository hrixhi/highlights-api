import { Arg, Field, ObjectType } from 'type-graphql';
import { ActivityModel } from './mongo/activity.model';
import { ActivityObject } from './types/activity.type';

/**
 * Activity Query Endpoints
 */
@ObjectType()
export class ActivityQueryResolver {
    @Field(type => [ActivityObject], {
        description: 'Used to find one user by id.'
    })
    public async getActivity(
        @Arg('userId', type => String)
        userId: string
    ) {
        try {
            return await ActivityModel.find({ userId }).limit(50);
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    @Field(type => [ActivityObject], {
        description: 'Used to find one user by id.'
    })
    public async getActivityAdmin(
        @Arg('userId', type => String)
        userId: string
    ) {
        try {
            return await ActivityModel.find({ userId })
                .sort({
                    date: -1
                })
                .limit(50);
        } catch (e) {
            console.log(e);
            return [];
        }
    }
}
