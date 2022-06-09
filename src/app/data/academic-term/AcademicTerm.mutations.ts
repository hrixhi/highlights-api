import { Arg, Field, ObjectType } from 'type-graphql';
import { AcademicTermInput } from './input-types/AcademicTermInput.type';
import { AcademicTermModel } from './mongo/academicTerm.model';

@ObjectType()
export class AcademicTermMutationResolver {
    @Field((type) => Boolean, {
        description: 'Used when you want to update unread messages count.',
    })
    public async create(
        @Arg('academicTermInput', (type) => [AcademicTermInput]) academicTermInput: [AcademicTermInput]
    ) {
        try {
            let containsNewDefault = false;
            let schoolId = academicTermInput[0].schoolId;

            const termsToAdd: any[] = academicTermInput.map((term: any) => {
                if (term.default) {
                    containsNewDefault = true;
                }

                return term;
            });

            if (containsNewDefault) {
                await AcademicTermModel.updateMany(
                    {
                        schoolId,
                    },
                    {
                        default: false,
                    }
                );
            }

            const createTerms = await AcademicTermModel.insertMany(termsToAdd);

            return true;
        } catch (e) {
            console.log('Error', e);
            return false;
        }
    }
}
