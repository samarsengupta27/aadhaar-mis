import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import divisions from "../data/divisions";

export async function seedDivisionMaster() {
  try {
    for (const division of divisions) {
      await setDoc(
        doc(db, "divisions", division.code),
        division,
        { merge: true }
      );
    }

    alert("Division Master created successfully.");
  } catch (err) {
    console.error(err);
    alert("Error creating Division Master.");
  }
}