import mongoose from "mongoose";

function connectDatabase() {
  mongoose
    .connect(process.env.DATABASE_URL)
    .then(() => console.log("MongoDB Atlas Connected!"))
    .catch((err) => console.log(`Error connecting to MongoDB Atlas: ${err}`));
}

export default connectDatabase;
