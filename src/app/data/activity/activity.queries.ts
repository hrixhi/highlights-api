import { Arg, Field, ObjectType } from 'type-graphql';
import { ActivityModel } from './mongo/activity.model';
import { ActivityObject } from './types/activity.type';

/**
 * Activity Query Endpoints
 */
@ObjectType()
export class ActivityQueryResolver {

    @Field(type => [ActivityObject], {
        description: "Used to find one user by id."
    })
    public async getActivity(
        @Arg("userId", type => String)
        userId: string
    ) {
        try {
            return await ActivityModel.find({ userId })
        } catch (e) {
            console.log(e)
            return []
        }
    }

}