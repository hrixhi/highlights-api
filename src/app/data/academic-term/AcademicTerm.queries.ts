import { Arg, Field, ObjectType } from 'type-graphql';
import { AcademicTermModel } from './mongo/academicTerm.model';
import { AcademicTermObject } from './types/AcademicTerm.type';

/**
 * Announcement Query Endpoints
 */
@ObjectType()
export class AcademicTermQueryResolver {
    @Field((type) => [AcademicTermObject], {
        description: 'Used to find one academic terms by school Id.',
        nullable: true,
    })
    public async getAcademicTerms(@Arg('schoolId', (type) => String) schoolId: string) {
        try {
            if (!schoolId) return null;

            const fetchAcademicTerms = await AcademicTermModel.find({
                schoolId,
            });

            return fetchAcademicTerms;
        } catch (e) {
            console.log('Error', e);
            return null;
        }
    }
}
