import { Schema } from 'mongoose';

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
    questionType: {
      type: String,
      required: false,
      // Add more question Types here such as True and False, Fill in the blanks, etc. Undefined would be MCQs
    },
    options: {
      type: [answerSchema],
      required: false
    },
    points: {
      type: Number,
      required: true
    }
  }
)

const schema = new Schema(
  {
    problems: {
      type: [problemSchema],
      required: true
    },
    duration: {
      type: Number,
      required: false
    },
    shuffleQuiz: {
      type: Boolean,
      required: false
    }
  }
)

export const quizSchema = schema;
