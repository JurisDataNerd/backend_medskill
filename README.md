List Endpoints:
http://localhost:5000/
http://localhost:5000/api-docs

Dari Projek ini aku mau kamu bantu aku untuk membuatkan sebuah frontend dari KelasSubscriptionTab.tsx..

Pertama terlebih dahulu aku memintamu untuk mempelajari struktur direktori projek ini yang dimana nantinya kita akan mengembangkan sebuah fitur Kelas Pembelejaran Subscription Based yang bisa membuka Video Materi dan PDF materi dan berasal dari folder uploads/videos dan uploads/materials...

User Liat Katalog --> Katalog ada 2 Plan (Full Course dan Per Stase) --> dibawahnya ada List Produknya dan Trailer PEr stasenya masing masiing nanti --> bisa di klik ke halaman detail --> masuk ke halaman detail stase preview (ada opsi pembayaran / beli Sekarang) --> Beli sekarang nanti ke midtrans --> dstnya Kalau yg FUll Course langsung di halaman KelasSubscriptionTab.tsx. nanti bikin halaman detail preview, detail kelas, kemduian pdf previewnya, dan juga video PAgenya nanti kita buat kayak youtube gitu.... bisa di autoplay ke tab selanjutnya dan bisa buka pdf materinya juga kayak jadi sidebar gitu

List Endpoint = 
GET /api/plans
GET /api/mentors
GET /api//me
POST /api/payments/create
POST /api/payments/webhook
GET /api/orders
POST /api/orders

Backend jangan diganggu gugat lagi, kita fokus frontend membuat UI dan alur usernya ya.. nanti desainnya sesuaikan dengan yang sudah ada dengan warna biru khas Medskill, make sure responsif di mobile juga