import { Schema } from 'mongoose';

const answerSchema = new Schema({
  option: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  previouslyCorrect: {
    type: Boolean,
    required: false
  }
})

const hotspotSchema = new Schema({
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
})

// // Drag and drop
// const itemSchema = new Schema({
//   id: {
//     type: Number,
//     required: true
//   },
//   text: {
//     type: String,
//     required: true
//   },
// })

// Drag and drop
// const zoneSchema = new Schema({
//   id: {
//     type: Number,
//     required: true
//   },
//   text: {
//     type: String,
//     required: true
//   },
//   items: {
//     type: [itemSchema],
//     required: false
//   }
// })

const problemSchema = new Schema(
  {
    question: {
      type: String,
      required: true
    },
    questionType: {
      type: String,
      required: false,
    },
    options: {
      type: [answerSchema],
      required: false
    },
    points: {
      type: Number,
      required: true
    },
    required: {
      type: Boolean,
      required: false
    },
    updatedAt: {
      type: Date,
      required: false
    },
    regradeChoice: {
      type: String,
      required: false
    },
    // Drag and drop
    data: {
      type: [[String]],
      required: false
    },
    headers: {
      type: [String],
      required: false
    },
    // hotspot
    hotspots: {
      type: [hotspotSchema],
      required: false
    },
    imgUrl: {
      type: String,
      required: false
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
    },
    instructions: {
      type: String,
      required: false
    },
    headers: {
      type: String,
      required: false
    }
  }
)

export const quizSchema = schema;
