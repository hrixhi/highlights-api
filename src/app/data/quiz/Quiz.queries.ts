import { Arg, Field, ObjectType } from 'type-graphql';
import { QuizModel } from './mongo/Quiz.model';
import { QuizObject } from './types/Quiz.type';

/**
 * Quiz Query Endpoints
 */
@ObjectType()
export class QuizQueryResolver {

    @Field(type => QuizObject, {
        description: 'Create quiz and return its id',
        nullable: true
    })
    public async getQuiz(
        @Arg('quizId', type => String) quizId: String,
    ) {
        try {
            return await QuizModel.findById(quizId)
        } catch (e) {
            return null
        }
    }

}
