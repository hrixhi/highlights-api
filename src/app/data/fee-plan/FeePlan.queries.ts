import { Arg, Field, ObjectType } from 'type-graphql';
import { FeePlanObject } from './types/FeePlanObject.type';
import { FeePlanModel } from './mongo/feePlan.model';

@ObjectType()
export class FeePlanQueryResolver {
    @Field((type) => [FeePlanObject], {
        description: 'Used to return Fee plans',
    })
    public async getFeePlans(
        @Arg('schoolId', (type) => String)
        schoolId: string
    ) {
        try {
            const fetchPlans = await FeePlanModel.find({
                schoolId,
            });

            return fetchPlans;
        } catch (e) {
            console.log('Error', e);
            return [];
        }
    }
}
