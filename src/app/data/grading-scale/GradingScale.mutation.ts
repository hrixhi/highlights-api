import { Arg, Field, ObjectType } from 'type-graphql';
import { GradingScaleModel } from './mongo/gradingScale.model';
import { GradingScaleInput } from './input-types/GradingScaleInput.type';

@ObjectType()
export class GradingScaleMutationResolver {
    @Field((type) => String, {
        description: 'Used when you want to update unread messages count.',
    })
    public async create(@Arg('gradingScaleInput', (type) => GradingScaleInput) gradingScaleInput: GradingScaleInput) {
        try {
            const fetchExistingGrade = await GradingScaleModel.findOne({
                schoolId: gradingScaleInput.schoolId,
                name: gradingScaleInput.name,
            });

            if (fetchExistingGrade) {
                return 'NAME_ALREADY_EXISTS';
            }

            // Check if name already exists

            if (gradingScaleInput.default) {
                await GradingScaleModel.updateMany(
                    {
                        schoolId: gradingScaleInput.schoolId,
                        standardsBasedScale: gradingScaleInput.standardsBasedScale ? true : undefined,
                    },
                    {
                        default: false,
                    }
                );
            }

            const createScale = await GradingScaleModel.create(gradingScaleInput);

            if (createScale) {
                return 'SUCCESSFUL';
            } else {
                return 'SOMETHING_WENT_WRONG';
            }
        } catch (e) {
            console.log('Error', e);
            return 'SOMETHING_WENT_WRONG';
        }
    }
}
