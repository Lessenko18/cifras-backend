import mongoose from "mongoose";

function connectDatabase() {
  mongoose.connect(process.env.DATABASE_URL);
}

export default connectDatabase;
