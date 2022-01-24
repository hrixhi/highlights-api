import { Arg, Field, ObjectType } from 'type-graphql';
import { ModificationsModel } from '../modification/mongo/Modification.model';
import { QuizModel } from './mongo/Quiz.model';
import { QuizInputObject } from './types/QuizInput.type';
import { CueModel } from '../cue/mongo/Cue.model';

/**
 * Quiz Mutation Endpoints
 */
@ObjectType()
export class QuizMutationResolver {
    @Field(type => String, {
        description: 'Create quiz and return its id'
    })
    public async createQuiz(@Arg('quiz', type => QuizInputObject) quiz: QuizInputObject) {
        try {
            const parsedQuiz: any = {
                ...quiz,
                duration: quiz.duration ? Number(quiz.duration) : null,
                shuffleQuiz: quiz.shuffleQuiz
            };
            quiz.problems.map((p, i) => {
                parsedQuiz.problems[i].points = Number(p.points);
            });
            const newQuiz = await QuizModel.create({
                ...parsedQuiz
            });

            return newQuiz._id;
        } catch (e) {
            return 'error';
        }
    }

    @Field(type => Boolean, {
        description: 'Update quiz and return its id'
    })
    public async modifyQuiz(
        @Arg('cueId', type => String) cueId: string,
        @Arg('quiz', type => QuizInputObject) quiz: QuizInputObject,
        @Arg('modifiedCorrectAnswers', type => [String], { nullable: true }) modifiedCorrectAnswers?: string[],
        @Arg('regradeChoices', type => [String], { nullable: true }) regradeChoices?: string[]
    ) {
        try {
            const parsedQuiz: any = {
                ...quiz
            };
            quiz.problems.map((p, i) => {
                parsedQuiz.problems[i].points = Number(p.points);
            });

            // Fetch Cue and get quizId first

            const fetchCue = await CueModel.findById({
                _id: cueId
            });

            if (!fetchCue) return false;

            if (fetchCue.cue) {
                const parsed = JSON.parse(fetchCue.cue);

                // Fetch the existing Quiz

                const currentQuiz = await QuizModel.findById(parsed.quizId);

                if (!currentQuiz) return false;

                // Existing Problems

                const currentProblems = currentQuiz.toObject().problems;

                // Modified quiz and problems

                const modifiedQuiz: any = { ...quiz };

                const modifiedProblems = modifiedQuiz.problems;

                // First update all the Quiz data

                // Loop over questions and update the questions with correct choice/previously correct and regrade choice and time
                const updatedProblems: any[] = modifiedProblems.map((prob: any, index: number) => {
                    // Update MCQs and True and False with regrade options
                    if (
                        (prob.questionType === '' || prob.questionType === 'trueFalse') &&
                        modifiedCorrectAnswers &&
                        regradeChoices &&
                        modifiedCorrectAnswers[index] === 'yes'
                    ) {
                        // Update choices
                        const updatedOptions = currentProblems[index].options.map((original: any, i: number) => {
                            const modifiedOption = prob.options[i];

                            // Set previously correct to true if option has been changed to false
                            if (modifiedOption.isCorrect !== original.isCorrect) {
                                if (original.isCorrect && !modifiedOption.isCorrect) {
                                    modifiedOption.previouslyCorrect = true;
                                }
                            }

                            return modifiedOption;
                        });

                        // Update problem regrade choice and updatedAt and return

                        // console.log("Updated options", updatedOptions)

                        const update = {
                            ...prob,
                            updatedAt: new Date(),
                            regradeChoice: regradeChoices[index]
                        };

                        update.options = updatedOptions;

                        return update;
                    }

                    return prob;
                });

                // console.log("Updated Problems", updatedProblems);

                const updateQuiz = await QuizModel.updateOne(
                    {
                        _id: parsed.quizId
                    },
                    {
                        $set: {
                            problems: updatedProblems,
                            headers: quiz.headers,
                            instructions: quiz.instructions,
                            duration: quiz.duration ? quiz.duration : null,
                            shuffleQuiz: quiz.shuffleQuiz ? quiz.shuffleQuiz : false
                        }
                    }
                );

                // Next regrade all the quizzes which are already submitted

                const regrades = await ModificationsModel.find({
                    cueId,
                    submittedAt: { $exists: true }
                });

                //
                regrades.map(async (mod: any) => {
                    const cue = mod.cue;

                    const parse = JSON.parse(cue);

                    // console.log("Before Regrade data", mod)

                    // WITH NEW SCHEMA NEED TO REGRADE ALL THE POSSIBLE ATTEMPTS

                    const attempts = parse.attempts;

                    if (!attempts || attempts.length === 0) {
                        return;
                    }

                    const updatedAttempts = [...attempts];

                    let totalScore = 0;

                    let currentActiveAttemptScore = 0;

                    let currentActiveAttemptIndex = 0;

                    let gradedAttemptsHighestScore = 0;

                    let gradedAttemptsHighestIndex = 0;

                    attempts.map((attempt: any, attemptIndex: number) => {
                        const solutions = attempt.solutions;
                        const currScores = attempt.problemScores;
                        let updatedScores: any[] = [];
                        let score = 0;
                        let total = 0;

                        updatedProblems.map((prob: any, index: number) => {
                            total += prob.points !== null && prob.points !== undefined ? prob.points : 1;

                            if (
                                modifiedCorrectAnswers &&
                                modifiedCorrectAnswers[index] === 'yes' &&
                                (prob.questionType === '' || prob.questionType === 'trueFalse')
                            ) {
                                // Regrade score count based on regradeChoice

                                if (!regradeChoices) return;

                                if (regradeChoices[index] === 'awardCorrectBoth') {
                                    // Add check for partial grading later for MCQs
                                    let correctAnswers = 0;
                                    let totalAnswers = 0;

                                    prob.options.map((option: any, j: any) => {
                                        // Award correct answer even if previously correct
                                        if (
                                            (option.isCorrect || option.previouslyCorrect) &&
                                            solutions[index].selected[j].isSelected
                                        ) {
                                            // correct answers
                                            correctAnswers += 1;
                                        }
                                        // TO FIX
                                        if (option.isCorrect) {
                                            // total correct answers
                                            totalAnswers += 1;
                                        }
                                        if (!option.isCorrect && solutions[index].selected[j].isSelected) {
                                            if (option.previouslyCorrect !== undefined && option.previouslyCorrect) {
                                                return;
                                            }
                                            // to deduct points if answer is not correct but selected
                                            totalAnswers += 1;
                                        }
                                    });

                                    const calculatedScore = (
                                        (correctAnswers / totalAnswers) *
                                        (prob.points !== undefined && prob.points !== null ? prob.points : 1)
                                    ).toFixed(2);

                                    updatedScores[index] = calculatedScore;
                                    score += Number(calculatedScore);
                                } else if (regradeChoices[index] === 'giveEveryoneFullCredit') {
                                    updatedScores[index] = prob.points.toFixed(2);
                                    score += Number(prob.points);
                                } else if (regradeChoices[index] === 'onlyAwardPointsForNew') {
                                    // Add check for partial grading later for MCQs
                                    let correctAnswers = 0;
                                    let totalAnswers = 0;

                                    prob.options.map((option: any, j: any) => {
                                        // Award correct answer even if previously correct
                                        if (option.isCorrect && solutions[index].selected[j].isSelected) {
                                            // correct answers
                                            correctAnswers += 1;
                                        }
                                        // TO FIX
                                        if (option.isCorrect) {
                                            // total correct answers
                                            totalAnswers += 1;
                                        }
                                        if (!option.isCorrect && solutions[index].selected[j].isSelected) {
                                            // to deduct points if answer is not correct but selected
                                            totalAnswers += 1;
                                        }
                                    });

                                    const calculatedScore = (
                                        (correctAnswers / totalAnswers) *
                                        (prob.points !== undefined && prob.points !== null ? prob.points : 1)
                                    ).toFixed(2);

                                    updatedScores[index] = calculatedScore;
                                    score += Number(calculatedScore);
                                } else if (regradeChoices[index] === 'noRegrading') {
                                    updatedScores[index] = currScores[index];
                                    score += Number(currScores[index]);
                                }
                            } else {
                                // Keep existing score if Question type is not MCQ or true/false
                                updatedScores[index] = currScores[index];

                                if (!Number.isNaN(Number(currScores[index]))) {
                                    score += Number(currScores[index]);
                                }
                            }
                        });

                        // Update the attempt obj for specific index
                        // updatedAttempts[attemptIndex] = {
                        //     ...updatedAttempts[attemptIndex],
                        //     problemScores: updatedScores,
                        //     score
                        // }

                        updatedAttempts[attemptIndex].problemScores = updatedScores;
                        updatedAttempts[attemptIndex].score = score;

                        // console.log("Updated attempt", updatedAttempts[attemptIndex])
                        // If this attempt is the active attempt then we need to update the

                        if (attempt.isActive) {
                            currentActiveAttemptScore = score;
                            currentActiveAttemptIndex = attemptIndex;
                            totalScore = total;
                        }

                        // This makes sure that only a fully graded newly graded Attempt will replace the current attempt
                        if (attempt.isFullyGraded) {
                            if (score > currentActiveAttemptScore) {
                                gradedAttemptsHighestIndex = attemptIndex;
                                gradedAttemptsHighestScore = score;
                            }
                        }
                    });

                    let highestScore = currentActiveAttemptScore;

                    if (gradedAttemptsHighestIndex !== currentActiveAttemptIndex) {
                        // Set current attempt as inactive
                        highestScore = gradedAttemptsHighestScore;

                        updatedAttempts[gradedAttemptsHighestIndex].isActive = true;

                        updatedAttempts[currentActiveAttemptIndex].isActive = false;
                    }

                    parse.attempts = updatedAttempts;

                    // console.log("After Regrade data", parse)
                    // console.log("New Active score", activeAttemptNewScore)
                    console.log('Updated Attempts', updatedAttempts);

                    // Save the changes in the modifications along with the RegradedAt date
                    await ModificationsModel.updateOne(
                        {
                            _id: mod._id
                        },
                        {
                            score: Number(((highestScore / totalScore) * 100).toFixed(2)),
                            regradedAt: new Date(),
                            cue: JSON.stringify(parse)
                        }
                    );
                });

                if (updateQuiz.nModified > 0) {
                    return true;
                }

                return false;
            }

            return false;
        } catch (e) {
            console.log('Error', e);
            return false;
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
            // Check if submission released
            const c = await CueModel.findById(cueId);

            if (c && c.releaseSubmission) {
                return false;
            }

            await ModificationsModel.updateOne({ cueId, userId }, { cue });
            return true;
        } catch (e) {
            return false;
        }
    }
}
