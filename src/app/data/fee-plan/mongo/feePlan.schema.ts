import { Schema, Types } from 'mongoose';

const CoursePricingSchema = new Schema({
    courseId: {
        type: Types.ObjectId,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
});

const InvoiceItemSchema = new Schema({
    description: {
        type: String,
        required: true,
    },
    pricingType: {
        type: String,
        required: true,
        enum: ['fixed', 'variable'],
    },
    quantity: {
        type: Number,
        required: false,
    },
    price: {
        type: Number,
        required: false,
    },
    variableType: {
        type: String,
        required: false,
        enum: ['tuition_per_unit', 'tuition_per_course', 'variable_price'],
    },
    tuitionPerUnit: {
        type: Number,
        required: false,
    },
    pricePerCourse: {
        type: [CoursePricingSchema],
        required: false,
    },
    defaultCourseTuition: {
        type: Number,
        required: false,
    },
});

const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['amount_only', 'billing'],
    },
    feeAmount: {
        type: Number,
        required: false,
    },
    invoiceItems: {
        type: [InvoiceItemSchema],
        required: false,
    },
    billingType: {
        type: String,
        required: true,
        enum: ['one_time', 'installments', 'subscription'],
    },
    paymentDue: {
        type: Date,
        required: false,
    },
    dayOfMonth: {
        type: Number,
        required: false,
    },
    startMonth: {
        type: Date,
        required: false,
    },
    endMonth: {
        type: Date,
        required: false,
    },
    term: {
        type: Types.ObjectId,
        required: false,
    },
    schoolId: {
        type: Types.ObjectId,
        required: false,
    },
});

export const FeePlanSchema = schema;
