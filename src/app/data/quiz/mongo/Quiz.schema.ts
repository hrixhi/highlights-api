import { Schema, Types } from 'mongoose';

const answerSchema = new Schema({
  option: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  }
})

const problemSchema = new Schema(
  {
    question: {
      type: String,
      required: true
    },
    options: {
      type: [answerSchema],
      required: true
    }
  }
)

const schema = new Schema(
  {
    problems: {
      type: [problemSchema],
      required: true
    }
  }
)

export const quizSchema = schema;
