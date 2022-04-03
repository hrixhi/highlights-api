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

const dragDropDataSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
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

const hotspotOptionSchema = new Schema({
  option: {
    type: String,
    required: false
  },
  isCorrect: {
    type: Boolean,
    required: true
  }
})

const inlineChoiceOptionSchema = new Schema({
  option: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  }
})


const textEntryOptionSchema = new Schema({
  option: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true
  }
})

const problemSchema = new Schema(
  {
    question: {
      type: String,
      required: false
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
    dragDropData: {
      type: [[dragDropDataSchema]],
      required: false
    },
    dragDropHeaders: {
      type: [String],
      required: false
    },
    // hotspot
    hotspots: {
      type: [hotspotSchema],
      required: false
    },
    hotspotOptions: {
      type: [hotspotOptionSchema],
      required: false
    },
    imgUrl: {
      type: String,
      required: false
    },
    // highlightText
    highlightTextHtml: {
      type: String,
      required: false
    },
    highlightTextChoices: {
      type: [Boolean],
      required: false
    },
    inlineChoiceHtml: {
      type: String,
      required: false
    },
    inlineChoiceOptions: {
      type: [[inlineChoiceOptionSchema]],
      required: false
    },
    textEntryHtml: {
      type: String,
      required: false,
    },
    textEntryOptions: {
      type: [textEntryOptionSchema],
      required: false
    },
    multipartQuestions: {
      type: [String],
      required: false
    },
    multipartOptions: {
      type: [[inlineChoiceOptionSchema]],
      required: false
    },
    correctEquations: {
      type: [String],
      required: false
    },
    maxCharCount: {
      type: Number,
      required: false
    },
    matchTableHeaders: {
      type: [String],
      required: false
    }, 
    matchTableOptions: {
      type: [String],
      required: false
    },
    matchTableChoices: {
      type: [[Boolean]],
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
