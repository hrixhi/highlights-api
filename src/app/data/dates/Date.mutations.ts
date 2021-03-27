import { Arg, Field, ObjectType } from 'type-graphql';
import { DateModel } from './mongo/dates.model';

/**
 * Date Mutation Endpoints
 */
@ObjectType()
export class DateMutationResolver {

    @Field(type => Boolean, {
        description: 'Used when you want to update unread messages count.'
    })
    public async create(
        @Arg('userId', type => String) userId: string,
        @Arg('title', type => String) title: string,
        @Arg('start', type => String) start: string,
        @Arg('end', type => String) end: string
    ) {
        try {
            await DateModel.create({
                userId,
                title,
                start: new Date(start),
                end: new Date(end)
            })
            return true;
        } catch (e) {
            return false
        }
    }

}
