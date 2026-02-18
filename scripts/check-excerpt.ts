import { db } from "@/db"
import { raindrops } from "@/db/schema"
import { desc, isNotNull } from "drizzle-orm"

async function main() {
  const records = await db
    .select({
      id: raindrops.id,
      title: raindrops.title,
      excerptLength: raindrops.excerpt,
    })
    .from(raindrops)
    .where(isNotNull(raindrops.excerpt))
    .orderBy(desc(raindrops.createdAt))
    .limit(3)

  for (const record of records) {
    const excerpt = record.excerptLength || ""
    console.log("\n===================")
    console.log("ID:", record.id)
    console.log("Title:", record.title)
    console.log("Excerpt Length:", excerpt.length)
    console.log("Last 200 chars:", excerpt.slice(-200))
    console.log("===================")
  }
}

main().catch(console.error)
