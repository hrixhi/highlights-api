import { Arg, Field, ObjectType } from 'type-graphql';
import { ModificationsModel } from '../modification/mongo/Modification.model';
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

            console.log(quiz.shuffleQuiz)
            const parsedQuiz: any = {
                ...quiz,
                duration: quiz.duration ? Number(quiz.duration) : null,
                shuffleQuiz: quiz.shuffleQuiz,
            }
            quiz.problems.map((p, i) => {
                parsedQuiz.problems[i].points = Number(p.points)
            })
            const newQuiz = await QuizModel.create({
                ...parsedQuiz
            })

            console.log(newQuiz)
            return newQuiz._id
        } catch (e) {
            return 'error'
        }
    }

    @Field(type => Boolean, {
        description: 'Start quiz'
    })
    public async start(
        @Arg('cueId', type => String) cueId: string,
        @Arg('userId', type => String) userId: string,
        @Arg('cue', type => String) cue: string
    ) {
        try {
            await ModificationsModel.updateOne({ cueId, userId }, { cue })
            return true
        } catch (e) {
            return false
        }
    }

}
