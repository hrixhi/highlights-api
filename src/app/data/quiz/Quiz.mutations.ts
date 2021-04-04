import { Arg, Field, ObjectType } from 'type-graphql';
import { QuizModel } from './mongo/Quiz.model';
import { QuizInputObject } from './types/QuizInput.type';

/**
 * Quiz Mutation Endpoints
 */
@ObjectType()
export class QuizMutationResolver {

    @Field(type => String, {
        description: 'Create quiz and return its id'
    })
    public async createQuiz(
        @Arg('quiz', type => QuizInputObject) quiz: QuizInputObject,
    ) {
        try {
            const newQuiz = await QuizModel.create({
                ...quiz
            })
            return newQuiz._id
        } catch (e) {
            return 'error'
        }
    }

}
