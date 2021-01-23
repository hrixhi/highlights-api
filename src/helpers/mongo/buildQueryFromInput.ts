import { hashPassword } from '@app/data/methods';

/**
 * Used to process input object, trim all blank key:vals,
 * and in case of password field -> hash it
 */
export async function buildQueryFromInput(input: any) {
  // final object returned after processing
  const query: any = {};
  for (const key in input) {
    // if key is not empty
    if (key !== null && key !== undefined && key !== "id" && key !== "_id") {
      const mySelector: any = input;
      const val: any = mySelector[key];
      // If value is not empty
      if (val !== null && val !== undefined) {
        if (key === "password") {
          query[key] = await hashPassword(val);
        } else {
          query[key] = val;
        }
      }
    }
  }
  return query;
}
