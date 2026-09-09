import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const STASE_CONFIGS = [
  { order: 1, code: 'TO-STASE-01', title: 'Try Out 1: Bedah', questions: 50, duration: 50, price: 50000, desc: 'Simulasi intensif 50 soal Stase Bedah mencakup digestif, onkologi bedah, urologi, ortopedi, dan bedah saraf dengan analisis komponen diagnosis & tatalaksana.' },
  { order: 2, code: 'TO-STASE-02', title: 'Try Out 2: Obsgyn', questions: 50, duration: 50, price: 50000, desc: 'Simulasi komprehensif 50 soal Stase Obstetri & Ginekologi meliputi antenatal care, patologi kehamilan, partus abnormal, dan ginekologi umum.' },
  { order: 3, code: 'TO-STASE-03', title: 'Try Out 3: Dermatovenerologi', questions: 50, duration: 50, price: 45000, desc: 'Simulasi fokus 50 soal infeksi kulit bakteri/virus/jamur, alergi imunologi kulit, dermatitis, dan infeksi menular seksual.' },
  { order: 4, code: 'TO-STASE-04', title: 'Try Out 4: Pediatri', questions: 50, duration: 50, price: 50000, desc: 'Simulasi 50 soal Kesehatan Anak mencakup neonatologi, tumbuh kembang, infeksi tropis pediatrik, gizi buruk, resusitasi neonatus.' },
  { order: 5, code: 'TO-STASE-05', title: 'Try Out 5: THT, Mata', questions: 50, duration: 50, price: 45000, desc: 'Simulasi 50 soal kelainan refraksi, trauma mata, infeksi telinga, epistaksis, rhinitis, tonsilitis, dan kegawatdaruratan indera.' },
  { order: 6, code: 'TO-STASE-06', title: 'Try Out 6: Neurologi, Psikiatri', questions: 50, duration: 50, price: 50000, desc: 'Simulasi 50 soal stroke, sefalgia, epilepsi, infeksi SSP, neuropati, neurosa, psikosa, gangguan afektif dan adiksi.' },
  { order: 7, code: 'TO-STASE-07', title: 'Try Out 7: Pulmonologi, Kardiologi', questions: 50, duration: 50, price: 55000, desc: 'Simulasi 50 soal kegawatdaruratan kardiopulmoner, ACS, aritmia, gagal jantung, asma eksaserbasi, PPOK, dan TB paru resisten.' },
  { order: 8, code: 'TO-STASE-08', title: 'Try Out 8: GEH, Nefrologi, Reumatologi', questions: 50, duration: 50, price: 55000, desc: 'Simulasi 50 soal saluran cerna atas/bawah, sindrom nefrotik/nefritik, gagal ginjal akut/kronik, SLE, RA, dan gout arthritis.' },
  { order: 9, code: 'TO-STASE-09', title: 'Try Out 9: Endokrin, Hematologi-Onkologi, Infeksi-Tropis', questions: 50, duration: 50, price: 55000, desc: 'Simulasi 50 soal diabetes melitus, krisis tiroid, anemia defisiensi/hemolitik, DBD, malaria, tifoid, leptospirosis, dan HIV/AIDS.' },
  { order: 10, code: 'TO-STASE-10', title: 'Try Out 10: Public Health-Biostatistika, Forensik', questions: 60, duration: 60, price: 60000, desc: 'Simulasi 60 soal IKM-KP, epidemiologi, uji diagnostik biostatistika, sistem pembiayaan BPJS, tanatologi, traumatologi, dan medikolegal.' },
];

const FIVE_TO_CONFIGS = [
  { order: 1, code: 'TO-UKNPDPD-FULL-01', title: 'Try Out UKNPDPD 1', questions: 150, duration: 150, desc: 'Simulasi Nasional 150 Soal Standar UKNPDPD Paket 1 dilengkapi perankingan nasional dan ulasan komprehensif.' },
  { order: 2, code: 'TO-UKNPDPD-FULL-02', title: 'Try Out UKNPDPD 2', questions: 150, duration: 150, desc: 'Simulasi Nasional 150 Soal Standar UKNPDPD Paket 2 dilengkapi perankingan nasional dan ulasan komprehensif.' },
  { order: 3, code: 'TO-UKNPDPD-FULL-03', title: 'Try Out UKNPDPD 3', questions: 150, duration: 150, desc: 'Simulasi Nasional 150 Soal Standar UKNPDPD Paket 3 dilengkapi perankingan nasional dan ulasan komprehensif.' },
  { order: 4, code: 'TO-UKNPDPD-FULL-04', title: 'Try Out UKNPDPD 4', questions: 150, duration: 150, desc: 'Simulasi Nasional 150 Soal Standar UKNPDPD Paket 4 dilengkapi perankingan nasional dan ulasan komprehensif.' },
  { order: 5, code: 'TO-UKNPDPD-FULL-05', title: 'Try Out UKNPDPD 5', questions: 150, duration: 150, desc: 'Simulasi Nasional 150 Soal Standar UKNPDPD Paket 5 dilengkapi perankingan nasional dan ulasan komprehensif.' },
];

async function seed() {
  console.log("--- SEEDING TRYOUT PACKAGES ---");

  // 1. Seed Packages
  const packages = [
    {
      code: 'bundle_5_to',
      title: 'Paket 5 Try Out UKNPDPD',
      description: 'Simulasi komprehensif 750 soal standar nasional untuk uji kesiapanmu! Dapatkan 5 Paket TO Full yang dilengkapi peringkat nasional, grafik progres nilai, serta akses PPT Soal & Pembahasan langsung di website Medskill. Solusi tepat untuk mengukur dan mematangkan kemampuanmu sebelum Hari-H!',
      price: 350000,
      promo_price: 249000,
      total_questions: 750,
      order_index: 1,
      is_active: true,
      features: [
        '5 Paket Try Out UKNPDPD Full (Total 750 Soal)',
        'Sistem Soal Diacak (Fisher-Yates) Standar Ujian',
        'Peringkat Nasional & Grafik Progres Nilai',
        'Akses PPT Soal & Pembahasan Langsung',
        'Bisa Dikerjakan Berkali-kali (Unlimited Retake)'
      ]
    },
    {
      code: 'bundle_kombo',
      title: 'Paket Kombo Hemat TO UKNPDPD',
      description: 'Paket paling lengkap & paling hemat dengan Total 1.260 Soal (5 TO Full + 10 TO Per Stase)! Dapatkan Peringkat Nasional, Laporan Analisis Detail Per Stase, dan akses PPT Pembahasan langsung di website Medskill untuk kuasai materi secara menyeluruh.',
      price: 750000,
      promo_price: 499000,
      total_questions: 1260,
      order_index: 3,
      is_active: true,
      features: [
        'Total 1.260 Soal (5 TO Full + 10 TO Per Stase)',
        'Otomatis Membuka Semua 15 Paket Tryout Sekaligus',
        'Laporan Analisis Detail 4 Komponen per Stase',
        'Peringkat Nasional & Akses PPT Pembahasan',
        'Unlimited Retake untuk Seluruh Paket'
      ]
    }
  ];

  for (const pkg of packages) {
    const { data: existing } = await supabase.from('tryout_packages').select('id').eq('code', pkg.code).maybeSingle();
    if (existing) {
      await supabase.from('tryout_packages').update(pkg).eq('id', existing.id);
      console.log(`Updated package: ${pkg.title}`);
    } else {
      await supabase.from('tryout_packages').insert([pkg]);
      console.log(`Inserted package: ${pkg.title}`);
    }
  }

  console.log("\n--- SEEDING 5 SET TRYOUT UKNPDPD FULL ---");
  for (const cfg of FIVE_TO_CONFIGS) {
    const { data: existing } = await supabase.from('tryout_sets').select('id').eq('code', cfg.code).maybeSingle();
    const payload = {
      code: cfg.code,
      title: cfg.title,
      description: cfg.desc,
      total_questions: cfg.questions,
      total_duration_minutes: cfg.duration,
      is_published: true,
      bundle_type: 'bundle_5_to',
      is_shuffled: true,
      max_attempts: -1,
      price: 99000,
      img_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1000&auto=format&fit=crop',
      registration_closed: false
    };

    let tryoutId = existing?.id;
    if (existing) {
      await supabase.from('tryout_sets').update(payload).eq('id', existing.id);
      console.log(`Updated 5 TO Set: ${cfg.title}`);
    } else {
      const { data: inserted } = await supabase.from('tryout_sets').insert([payload]).select('id').single();
      tryoutId = inserted?.id;
      console.log(`Inserted 5 TO Set: ${cfg.title}`);
    }

    // Seed sample questions if empty
    if (tryoutId) {
      const { count } = await supabase.from('tryout_questions').select('*', { count: 'exact', head: true }).eq('tryout_id', tryoutId);
      if (count === 0) {
        console.log(`Seeding sample questions for ${cfg.title}...`);
        const sampleQuestions = [];
        const stations = ['Bedah', 'Obsgyn', 'Pediatri', 'Pulmonologi', 'Kardiologi', 'Neurologi', 'GEH'];
        for (let i = 1; i <= 10; i++) {
          sampleQuestions.push({
            tryout_id: tryoutId,
            question_number: i,
            text: `[Sample Soal ${cfg.title} No. ${i}] Seorang pasien datang dengan keluhan klinis khas. Berdasarkan anamnesis dan pemeriksaan fisik, apakah tatalaksana awal yang paling tepat?`,
            option_a: 'Pemberian antibiotik spektrum luas',
            option_b: 'Rehidrasi cairan intravena kristaloid',
            option_c: 'Pemeriksaan penunjang baku emas laboratorium',
            option_d: 'Tindakan dekompresi darurat',
            option_e: 'Edukasi dan observasi rawat jalan',
            correct_option: 'B',
            station: stations[i % stations.length],
            clinical_component: 'manajemen_terapi',
            halaman: 1
          });
        }
        await supabase.from('tryout_questions').insert(sampleQuestions);
      }
    }
  }

  console.log("\n--- SEEDING 10 SET TRYOUT PER STASE (A LA CARTE) ---");
  for (const cfg of STASE_CONFIGS) {
    const { data: existing } = await supabase.from('tryout_sets').select('id').eq('code', cfg.code).maybeSingle();
    const payload = {
      code: cfg.code,
      title: cfg.title,
      description: cfg.desc,
      total_questions: cfg.questions,
      total_duration_minutes: cfg.duration,
      is_published: true,
      bundle_type: 'bundle_stase',
      is_shuffled: false, // URUT / TIDAK DIACAK
      max_attempts: -1,
      price: cfg.price, // HARGA SATUAN A LA CARTE
      img_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=1000&auto=format&fit=crop',
      registration_closed: false
    };

    let tryoutId = existing?.id;
    if (existing) {
      await supabase.from('tryout_sets').update(payload).eq('id', existing.id);
      console.log(`Updated Stase Set: ${cfg.title} (Price: Rp ${cfg.price.toLocaleString('id-ID')})`);
    } else {
      const { data: inserted } = await supabase.from('tryout_sets').insert([payload]).select('id').single();
      tryoutId = inserted?.id;
      console.log(`Inserted Stase Set: ${cfg.title} (Price: Rp ${cfg.price.toLocaleString('id-ID')})`);
    }

    // Seed sample questions with clinical components if empty
    if (tryoutId) {
      const { count } = await supabase.from('tryout_questions').select('*', { count: 'exact', head: true }).eq('tryout_id', tryoutId);
      if (count === 0) {
        console.log(`Seeding sample questions with clinical components for ${cfg.title}...`);
        const sampleQuestions = [];
        const isTO10 = cfg.order === 10;
        const componentsStandard = ['etio_patofisiologi', 'penapisan_diagnosis', 'manajemen_terapi', 'rehabilitasi_edukasi'];
        const componentsTO10 = ['public_health', 'biostatistika', 'forensik', 'medikolegal'];
        const compList = isTO10 ? componentsTO10 : componentsStandard;

        const staseName = cfg.title.replace(/^Try Out \d+:\s*/, '');
        for (let i = 1; i <= 8; i++) {
          const comp = compList[(i - 1) % compList.length];
          sampleQuestions.push({
            tryout_id: tryoutId,
            question_number: i,
            text: `[${cfg.title} - Soal ${i}] Kasus simulasi terstandar stase ${staseName}. Pertanyaan mengevaluasi pemahaman area ${comp.replace(/_/g, ' ').toUpperCase()}.`,
            option_a: 'Pilihan intervensi A terstandar klinis',
            option_b: 'Pilihan intervensi B terstandar klinis',
            option_c: 'Pilihan intervensi C terstandar klinis',
            option_d: 'Pilihan intervensi D terstandar klinis',
            option_e: 'Pilihan intervensi E terstandar klinis',
            correct_option: i % 2 === 0 ? 'A' : 'C',
            station: staseName,
            clinical_component: comp,
            halaman: 1
          });
        }
        await supabase.from('tryout_questions').insert(sampleQuestions);
      }
    }
  }

  console.log("\nAll Tryout Sets, Packages, and Sample Questions seeded successfully!");
}

seed().catch(console.error);
