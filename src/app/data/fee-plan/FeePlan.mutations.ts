import { Arg, Field, ObjectType } from 'type-graphql';
import { FeePlanModel } from './mongo/feePlan.model';
import { FeePlanInput } from './input-types/FeePlanInput.type';

/**
 * Date Mutation Endpoints
 */
@ObjectType()
export class FeePlanMutationResolver {
    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async create(@Arg('feeplanInput', (type) => FeePlanInput) feeplanInput: FeePlanInput) {
        try {
            const createNewPlan = await FeePlanModel.create(feeplanInput);

            if (createNewPlan) {
                return true;
            }

            return false;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }
}
