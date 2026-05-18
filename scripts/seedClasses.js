import { supabase } from "../utils/supabase.js"

const classes = [
  { slug: "bedah", title: "Bedah" },
  { slug: "dve", title: "DVE" },
  { slug: "endokrin", title: "Endokrin" },
  { slug: "forensik", title: "Forensik" },
  { slug: "gastro-entero-hepatologi", title: "Gastro Entero Hepatologi" },
  { slug: "hematologi", title: "Hematologi" },
  { slug: "infeksi-tropis", title: "Infeksi Tropis" },
  { slug: "kardiologi", title: "Kardiologi" },
  { slug: "mata", title: "Mata" },
  { slug: "nefro-reumatologi", title: "Nefro Reumatologi" },
  { slug: "neurologi", title: "Neurologi" },
  { slug: "obsgyn", title: "Obsgyn" },
  { slug: "pediatri", title: "Pediatri" },
  { slug: "ph-biostatik", title: "PH Biostatik" },
  { slug: "psikiatri", title: "Psikiatri" },
  { slug: "pulmo", title: "Pulmo" },
  { slug: "tht", title: "THT" }
]

async function seed() {

  for (const cls of classes) {

    const { error } = await supabase
      .from("classes")
      .insert({
        slug: cls.slug,
        name: cls.title,
        title: cls.title,
        description: cls.title + " class",
        price: 0,
        duration_days: 365,
        is_active: true
      })

    if (error) {
      console.log("Insert error:", error.message)
    } else {
      console.log("Inserted:", cls.slug)
    }

  }

}

seed()