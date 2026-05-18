import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { supabase } from "../utils/supabase.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/*
project-root/
   backend/scripts/indexContent.js
   uploads/
*/

const projectRoot = path.join(__dirname, "../../")
const uploadsRoot = path.join(projectRoot, "uploads")

async function indexType(type) {

  const basePath = path.join(uploadsRoot, type)

  if (!fs.existsSync(basePath)) {
    console.log(`Folder ${type} not found`)
    return
  }

  const subjects = fs.readdirSync(basePath)

  for (const subject of subjects) {

    const subjectPath = path.join(basePath, subject)

    if (!fs.lstatSync(subjectPath).isDirectory()) continue

    console.log(`Indexing ${type}/${subject}`)

    const { data: cls, error } = await supabase
      .from("classes")
      .select("id")
      .eq("slug", subject)
      .single()

    if (error || !cls) {
      console.log(`Class not found for slug: ${subject}`)
      continue
    }

    const files = fs.readdirSync(subjectPath)

    for (const file of files) {

      const filePath = `uploads/${type}/${subject}/${file}`

      const { data: existing } = await supabase
        .from("class_contents")
        .select("id")
        .eq("file_path", filePath)
        .maybeSingle()

      if (existing) {
        console.log(`Skip existing: ${file}`)
        continue
      }

      const typeValue = type === "videos" ? "video" : "pdf"

      const { error: insertError } = await supabase
        .from("class_contents")
        .insert({
          class_id: cls.id,
          title: file,
          type: typeValue,
          file_path: filePath
        })

      if (insertError) {
        console.log("Insert error:", insertError.message)
      } else {
        console.log(`Inserted: ${file}`)
      }

    }

  }

}

async function run() {

  console.log("Starting content indexing...")

  await indexType("videos")
  await indexType("materials")

  console.log("Indexing complete")

}

run()