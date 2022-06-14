import { Arg, Field, ObjectType } from 'type-graphql';
import { GradingScaleModel } from './mongo/gradingScale.model';
import { GradingScaleObject } from './types/GradingScaleObject.types';

/**
 * Announcement Query Endpoints
 */
@ObjectType()
export class GradingScaleQueryResolver {
    @Field((type) => [GradingScaleObject], {
        description: 'Used to find one academic terms by school Id.',
        nullable: true,
    })
    public async getGradingScales(@Arg('schoolId', (type) => String) schoolId: string) {
        try {
            if (!schoolId) return null;

            const gradingScales = await GradingScaleModel.find({
                schoolId,
            });

            return gradingScales;
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }
}
