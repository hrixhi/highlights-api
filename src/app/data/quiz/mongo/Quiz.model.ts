import { Document, Model, model } from 'mongoose';
import { quizSchema } from './Quiz.schema';

export interface IQuizModel extends Document {
	problems: any;
}

export const QuizModel: Model<IQuizModel> = model<IQuizModel>(
	'quizzes',
	quizSchema,
);
