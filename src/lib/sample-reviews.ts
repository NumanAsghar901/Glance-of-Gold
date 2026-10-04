/**
 * PLACEHOLDER content for previewing the store. These are not real customer reviews: every row is
 * stored with is_sample = true so the admin can remove all of them in one click before launch.
 */

const FEMALE = [
  "Ayesha Khan", "Fatima Noor", "Sana Malik", "Hira Tariq", "Maryam Siddiqui", "Zainab Ali", "Iqra Hussain",
  "Nimra Aslam", "Areeba Shah", "Mahnoor Qureshi", "Sidra Javed", "Rabia Akhtar", "Kinza Butt", "Laiba Farooq",
  "Hafsa Rauf", "Amna Saeed", "Esha Raza", "Aliza Mirza", "Komal Iqbal", "Sehrish Anwar", "Bushra Nawaz",
  "Anum Rehman", "Mahira Zafar", "Dua Fatima", "Rimsha Yousaf", "Tooba Khalid", "Noor ul Ain", "Hajra Latif",
  "Saba Kanwal", "Warda Imtiaz", "Zoya Sheikh", "Mariam Chaudhry",
];
const MALE = [
  "Ahmed Raza", "Usman Ghani", "Bilal Ahmad", "Hamza Sheikh", "Faisal Mehmood", "Talha Rashid", "Zeeshan Ali",
  "Imran Shah", "Hassan Abbas", "Saad Qureshi", "Danish Iqbal", "Kamran Akhtar", "Omer Farooq", "Adeel Hussain",
  "Junaid Malik", "Rizwan Aslam",
];
const CITIES = [
  "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot",
  "Gujranwala", "Hyderabad", "Bahawalpur", "Sargodha", "Abbottabad",
];

// {item} is replaced with the product type, e.g. "necklace" or "earrings".
const FIVE = [
  "Bohat khoobsurat {item} hai, bilkul picture jaisa. Highly recommended!",
  "Looks exactly like the photos. I got so many compliments at my cousin's mehndi.",
  "The packaging was neat and delivery was quick. Very happy with this {item}.",
  "Lovely finish and so light to wear all day. Will order again.",
  "Maine apni behan ko gift kiya tha, usay boht pasand aya. Shukriya Glance of Gold.",
  "Perfect for weddings. The {item} caught the light beautifully in every photo.",
  "Great value for money. The quality is better than I expected.",
  "Ordered on cash on delivery, arrived on time and the team confirmed on WhatsApp. Smooth experience.",
  "Mujhe yeh {item} bohat pasand aya, colour bilkul sunehri hai. Zabardast!",
  "Elegant and simple. It goes with both western and shalwar kameez.",
  "Gifted this to my wife on our anniversary and she loved it.",
  "Beautiful design, and the clasp feels sturdy. Five stars from me.",
  "Quality ka koi muqabla nahi, packing bhi bohat achi thi.",
  "Everyone at the event asked where I bought it. Totally worth it.",
];
const FOUR = [
  "Nice {item}, the colour is a tiny bit lighter than the picture but still very pretty.",
  "Good quality and lovely design. Delivery took one day more than expected.",
  "Bohat acha hai, bas thora sa aur heavy hota to maza aa jata. Overall happy.",
  "Pretty and comfortable to wear. I would like more size options.",
  "Looks great. Packaging could be a little stronger but the {item} arrived safely.",
  "Very satisfied with the finish. A good everyday piece.",
  "Lovely {item}, my sister liked it so much that she ordered one too.",
  "Good value. The shine is nice and it matched my outfit well.",
  "Pasand aya, delivery fast thi. Price thori kam hoti to perfect.",
  "Beautiful piece, would recommend for parties and small functions.",
];
const THREE = [
  "It looks nice, but I expected it to feel a little heavier.",
  "Decent {item} for the price. The shade was slightly different in daylight.",
  "Theek hai, design achi hai magar finish thora aur behtar ho sakta hai.",
  "Pretty design. Delivery was slower than I hoped, but the team was helpful.",
];

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

function pickName() {
  // About two thirds of the reviewers are women.
  return Math.random() < 0.65 ? pick(FEMALE) : pick(MALE);
}

function pickRating() {
  const r = Math.random();
  if (r < 0.58) return 5;
  if (r < 0.9) return 4;
  return 3;
}

const ITEM_BY_CATEGORY: Record<string, string> = {
  necklaces: "necklace",
  earrings: "earrings",
  rings: "ring",
  "bangles-bracelets": "bangles",
  sets: "set",
};

export type SampleReviewRow = {
  product_id: number;
  author_name: string;
  city: string;
  rating: number;
  comment: string;
  is_sample: true;
  created_at: string;
};

/** 1 to 10 sample reviews for one product, dated across the last four months. */
export function sampleReviewsFor(product: { id: number; categorySlug: string | null }): SampleReviewRow[] {
  const item = (product.categorySlug && ITEM_BY_CATEGORY[product.categorySlug]) || "piece";
  const count = between(1, 10);
  const usedNames = new Set<string>();
  const usedComments = new Set<string>();
  const rows: SampleReviewRow[] = [];

  for (let i = 0; i < count; i++) {
    let name = pickName();
    for (let t = 0; t < 8 && usedNames.has(name); t++) name = pickName();
    usedNames.add(name);

    const rating = pickRating();
    const pool = rating === 5 ? FIVE : rating === 4 ? FOUR : THREE;
    let comment = pick(pool);
    for (let t = 0; t < 8 && usedComments.has(comment); t++) comment = pick(pool);
    usedComments.add(comment);

    const days = between(1, 120);
    const when = new Date(Date.now() - days * 86_400_000 - between(0, 20) * 3_600_000);

    rows.push({
      product_id: product.id,
      author_name: name,
      city: pick(CITIES),
      rating,
      comment: comment.replaceAll("{item}", item),
      is_sample: true,
      created_at: when.toISOString(),
    });
  }
  return rows;
}

/** Sample "units sold" figure shown on a product (5 to 15). */
export const sampleSoldCount = () => between(5, 15);
