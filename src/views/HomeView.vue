<script setup>
import { ref, computed, onMounted } from 'vue'
import { MapPinIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, UsersIcon, CalendarDaysIcon, GlobeAltIcon, BookOpenIcon, TagIcon, ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import BookingModal from '../components/BookingModal.vue'
import { GAS_URL } from '../config.js'

// --- DATA CALENDAR ---
const dates = ref([])
const selectedDate = ref(null)
const calendarScroll = ref(null)

// Generator tanggal (14 hari ke depan)
const generateDates = () => {
  const result = []
  const today = new Date()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const indonesianDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dayOfWeek = d.getDay()
    
    // Kamis (4) sampai Minggu (0) BUKA. Senin (1), Selasa (2), Rabu (3) TUTUP.
    const isClosed = dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 3
    const isToday = i === 0

    result.push({
      dateObj: d,
      date: d.getDate(),
      dayName: days[dayOfWeek], // e.g. "Wed"
      fullDayName: indonesianDays[dayOfWeek],
      monthName: months[d.getMonth()], // e.g. "Jun"
      fullDateStr: d.toISOString().split('T')[0],
      isClosed: isClosed,
      isToday: isToday
    })
  }
  dates.value = result
  
  // Pilih hari pertama yang tidak tutup secara default
  const firstOpenDay = result.find(d => !d.isClosed)
  if (firstOpenDay) {
    selectedDate.value = firstOpenDay
  }
}

const scrollCalendar = (direction) => {
  if (calendarScroll.value) {
    const scrollAmount = direction === 'left' ? -200 : 200
    calendarScroll.value.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }
}

const currentMonthYear = computed(() => {
  if (dates.value.length === 0) return ''
  const firstDate = dates.value[0].dateObj
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${monthsFull[firstDate.getMonth()]}, ${firstDate.getFullYear()}`
})

// --- DATA SLOTS ---
const slots = [
  { id: 1, label: '12:00 - 14:00 WIB', time: 'Siang' },
  { id: 2, label: '14:00 - 16:00 WIB', time: 'Sore' },
  { id: 3, label: '16:00 - 18:00 WIB', time: 'Petang' }
]

const bookedSlots = ref({})
const isFetchingAvailability = ref(true)

const fetchAvailability = async () => {
  isFetchingAvailability.value = true
  try {
    // Menggunakan cache buster agar browser tidak menggunakan data lama (cache)
    const res = await fetch(`${GAS_URL}?t=${new Date().getTime()}`)
    const json = await res.json()
    if (json.success && json.data) {
      const newBooked = {}
      json.data.forEach(b => {
        // GAS mengembalikan ISO string UTC (bergeser mundur karena beda zona waktu).
        // Kita paksa maju 12 jam di zona UTC untuk mendapatkan tanggal aslinya dengan aman
        const dateObj = new Date(b.tanggal)
        dateObj.setUTCHours(dateObj.getUTCHours() + 12)
        const dateStr = dateObj.toISOString().split('T')[0]
        
        // Kompatibilitas jika di spreadsheet masih menggunakan format angka (1, 2, 3)
        let slotName = b.slot
        if (b.slot == 1) slotName = 'Siang (12:00 - 14:00 WIB)'
        if (b.slot == 2) slotName = 'Sore (14:00 - 16:00 WIB)'
        if (b.slot == 3) slotName = 'Petang (16:00 - 18:00 WIB)'

        newBooked[`${dateStr}-${slotName}`] = true
      })
      bookedSlots.value = newBooked
    }
  } catch (err) {
    console.error("Gagal menarik data jadwal:", err)
  } finally {
    isFetchingAvailability.value = false
  }
}

const checkAvailability = (dateStr, slot) => {
  const slotName = `${slot.time} (${slot.label})`
  const key = `${dateStr}-${slotName}`
  return !bookedSlots.value[key]
}

// --- MODAL STATE ---
const isModalOpen = ref(false)
const activeSlot = ref(null)

const openModal = (slot) => {
  activeSlot.value = slot
  isModalOpen.value = true
}

const isSuccessModalOpen = ref(false)
const isDescriptionExpanded = ref(false)
const isRulesExpanded = ref(false)

const handleBookingSubmit = (formData) => {
  console.log('Data Reservasi Tersimpan:', formData)
  isModalOpen.value = false
  isSuccessModalOpen.value = true
}

onMounted(() => {
  generateDates()
  fetchAvailability()
})
</script>

<template>
  <div class="min-h-screen bg-nandur-bg font-sans flex flex-col items-center pb-28 md:pb-34 relative">
    
    <!-- HEADER -->
    <header class="w-full max-w-3xl px-6 pt-16 pb-8">
      <div class="flex items-center gap-3 md:gap-4 mb-3">
        <img src="/nandur-buku-icon.webp" alt="Logo Nandur Buku" class="w-10 h-10 md:w-14 md:h-14 object-contain" />
        <h1 class="text-3xl md:text-5xl font-bold text-nandur-text">Nandur Buku Reservation</h1>
      </div>
      <p class="text-nandur-text/70 text-sm md:text-base">
        Halo, selamat datang di Nandur Buku. Kami adalah ruang literasi yang menyediakan perpustakaan privat secara gratis. 
        Bagi warga Jakarta dan sekitarnya, yuk baca berbagai koleksi di perpus kami.
      </p>
    </header>

    <main class="w-full max-w-3xl px-4 flex flex-col gap-6">

      <!-- TENTANG NANDUR BUKU -->
      <section class="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] p-5 md:p-6 border border-gray-50 text-nandur-text relative">
        <h2 class="text-lg md:text-xl font-bold mb-3 text-nandur-green">Tentang Nandur Buku</h2>
        
        <div class="relative">
          <div 
            class="text-sm md:text-base text-nandur-text/80 leading-relaxed transition-all duration-500 ease-in-out overflow-hidden space-y-3" 
            :class="isDescriptionExpanded ? 'max-h-[1000px]' : 'max-h-[4.5rem]'"
          >
            <p>
              Nandur Buku merupakan perpustakaan berbasis rumah (home library) yang dikelola secara mandiri. Untuk menjaga kenyamanan bersama, kunjungan dilakukan berdasarkan jadwal yang telah dikonfirmasi dan dengan jumlah pengunjung yang terbatas.
            </p>
            <p>
              Dengan mengisi formulir ini, saya memahami bahwa pengiriman formulir belum berarti reservasi saya otomatis diterima. Pihak Nandur Buku akan mengkonfirmasi terlebih dahulu melalui WhatsApp kami di <span class="font-semibold text-nandur-text">0895-8089-20117</span>.
            </p>
            <p>
              Saya bersedia datang sesuai jadwal yang telah dikonfirmasi, menjaga ketenangan, kebersihan, serta memperlakukan seluruh koleksi buku dan fasilitas dengan baik. Apabila saya berhalangan hadir atau ingin mengubah jadwal kunjungan, saya akan menginformasikannya kepada pengelola sesegera mungkin.
            </p>
            <p>
              Saya juga memahami bahwa pihak Nandur Buku berhak menyesuaikan atau membatalkan jadwal kunjungan apabila terdapat kondisi tertentu yang tidak memungkinkan untuk menerima tamu.
            </p>
          </div>
        </div>

        <button 
          @click="isDescriptionExpanded = !isDescriptionExpanded" 
          class="mt-2 text-nandur-green font-bold text-sm hover:underline"
        >
          {{ isDescriptionExpanded ? 'Tampilkan lebih sedikit' : 'Selengkapnya...' }}
        </button>
      </section>

      <!-- ATURAN BERKUNJUNG -->
      <section class="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] p-5 md:p-6 border border-gray-50 text-nandur-text relative">
        <h2 class="text-lg md:text-xl font-bold mb-4 text-nandur-green">Aturan Berkunjung</h2>
        
        <div class="relative">
          <div 
            class="text-sm md:text-base text-nandur-text/80 leading-relaxed transition-all duration-500 ease-in-out overflow-hidden space-y-3" 
            :class="isRulesExpanded ? 'max-h-[1000px]' : 'max-h-[4.5rem]'"
          >
            <p>
              Demi kenyamanan bersama selama berada di area baca Nandur Buku, kami memohon kerja sama seluruh pengunjung untuk mematuhi beberapa aturan berikut:
            </p>
            <ul class="space-y-3 list-disc list-outside pl-5">
              <li>
                <strong class="text-nandur-text">Datang Tepat Waktu:</strong> Harap hadir sesuai dengan jadwal sesi yang telah Anda pesan. Keterlambatan dapat mengurangi waktu baca Anda secara keseluruhan.
              </li>
              <li>
                <strong class="text-nandur-text">Menjaga Ketenangan:</strong> Ruang literasi ini dirancang untuk membaca dengan fokus dan rileks. Mohon tidak berisik atau mengobrol terlalu keras agar kenyamanan pengunjung lain tetap terjaga.
              </li>
              <li>
                <strong class="text-nandur-text">Dilarang Membawa Makanan & Minuman Luar:</strong> Untuk menjaga kebersihan ruangan serta melindungi koleksi buku kami dari kerusakan, pengunjung tidak diperkenankan membawa makanan dan minuman dari luar.
              </li>
            </ul>
            <p class="font-medium italic pt-2">
              Terima kasih atas pengertian dan kerja sama Anda dalam menjaga suasana ruang literasi Nandur Buku!
            </p>
          </div>
        </div>

        <button 
          @click="isRulesExpanded = !isRulesExpanded" 
          class="mt-3 text-nandur-green font-bold text-sm hover:underline"
        >
          {{ isRulesExpanded ? 'Tampilkan lebih sedikit' : 'Selengkapnya...' }}
        </button>
      </section>
      
      <!-- LOKASI KAMI -->
      <section class="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] p-4 md:p-5 flex items-center justify-between border border-gray-50 relative overflow-hidden">
        <div class="z-10">
          <h3 class="font-bold text-nandur-text text-sm">Lokasi Kami</h3>
          <p class="text-sm text-nandur-text/70 mt-0.5">Kapuk Muara, Jakarta Barat</p>
        </div>
        <div class="z-10 flex flex-col items-center justify-center text-nandur-green">
          <MapPinIcon class="w-6 h-6 mb-1" />
        </div>
        <!-- Dekorasi latar belakang (peta tipis buatan) -->
        <div class="absolute right-0 top-0 bottom-0 w-32 pointer-events-none opacity-[0.03]">
          <svg viewBox="0 0 100 100" class="w-full h-full text-black fill-current" preserveAspectRatio="none">
             <path d="M10,10 L90,10 L90,90 L10,90 Z M20,20 L80,20 M20,40 L80,40 M20,60 L80,60 M20,80 L80,80 M40,20 L40,80 M60,20 L60,80" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </div>
      </section>

      <!-- INFORMASI SINGKAT -->
      <section class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full">
        <div class="flex items-center gap-3">
          <div class="bg-nandur-green/10 p-2 rounded-lg flex-shrink-0">
            <UsersIcon class="w-5 h-5 text-nandur-green" />
          </div>
          <span class="text-sm font-medium leading-tight">Maks 4 org</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-nandur-green/10 p-2 rounded-lg flex-shrink-0">
            <CalendarDaysIcon class="w-5 h-5 text-nandur-green" />
          </div>
          <span class="text-sm font-medium leading-tight">Senin - Rabu libur</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-nandur-green/10 p-2 rounded-lg flex-shrink-0">
            <GlobeAltIcon class="w-5 h-5 text-nandur-green" />
          </div>
          <span class="text-sm font-medium leading-tight">Terbuka umum</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-nandur-green/10 p-2 rounded-lg flex-shrink-0">
            <BookOpenIcon class="w-5 h-5 text-nandur-green" />
          </div>
          <span class="text-sm font-medium leading-tight">Koleksi melimpah</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-nandur-green/10 p-2 rounded-lg flex-shrink-0">
            <TagIcon class="w-5 h-5 text-nandur-green" />
          </div>
          <span class="text-sm font-medium leading-tight">Reservasi gratis</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-nandur-green/10 p-2 rounded-lg flex-shrink-0">
            <ChatBubbleLeftRightIcon class="w-5 h-5 text-nandur-green" />
          </div>
          <span class="text-sm font-medium leading-tight">Open diskusi</span>
        </div>
      </section>

      <!-- KALENDER COMPONENT -->
      <section class="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] p-4 md:p-6 border border-gray-50">
        
        <!-- Header Bulan -->
        <div class="flex items-center justify-center gap-1 mb-5">
          <span class="font-bold text-lg tracking-wide">{{ currentMonthYear }}</span>
          <ChevronDownIcon class="w-4 h-4 text-gray-500 stroke-2" />
        </div>
        
        <!-- Area Kalender Abu-abu -->
        <div class="bg-[#f8f9fa] rounded-xl p-2 flex items-center relative group shadow-inner">
          
          <!-- Tombol Kiri -->
          <button @click="scrollCalendar('left')" class="p-2 ml-1 rounded-full hover:bg-white hover:shadow-sm text-gray-400 hover:text-black transition-all absolute left-0 z-10 hidden sm:block">
            <ChevronLeftIcon class="w-5 h-5 stroke-2" />
          </button>

          <!-- Deretan Tanggal -->
          <div ref="calendarScroll" class="flex gap-2 overflow-x-auto hide-scrollbar scroll-smooth w-full sm:px-12 px-2 pt-4 pb-2">
            <div 
              v-for="d in dates" 
              :key="d.fullDateStr"
              @click="!d.isClosed && (selectedDate = d)"
              class="flex-shrink-0 flex flex-col items-center justify-center w-[5rem] h-[4.5rem] rounded-xl transition-all duration-300 relative cursor-pointer"
              :class="[
                d.isClosed 
                  ? 'bg-red-50/30 cursor-not-allowed' 
                  : selectedDate?.fullDateStr === d.fullDateStr
                    ? 'bg-white shadow-md text-black cursor-default scale-105 ring-1 ring-gray-100'
                    : 'text-gray-400 hover:text-black hover:bg-white/50'
              ]"
            >
              <div class="text-[14px] whitespace-nowrap mb-0.5" :class="d.isClosed ? 'text-gray-400 line-through decoration-gray-300' : (selectedDate?.fullDateStr === d.fullDateStr ? 'font-bold' : '')">
                {{ d.date }} {{ d.monthName }}
              </div>
              <div class="text-[11px] tracking-wider font-bold" :class="d.isClosed ? 'text-red-400' : (selectedDate?.fullDateStr === d.fullDateStr ? 'opacity-80 font-medium' : 'opacity-60')">
                {{ d.isClosed ? 'TUTUP' : d.dayName }}
              </div>
              <!-- Badge Hari Ini -->
              <div v-if="d.isToday" class="absolute -top-2 -right-2 bg-nandur-green text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 border border-white">
                HARI INI
              </div>
            </div>
          </div>

          <!-- Tombol Kanan -->
          <button @click="scrollCalendar('right')" class="p-2 mr-1 rounded-full hover:bg-white hover:shadow-sm text-gray-400 hover:text-black transition-all absolute right-0 z-10 hidden sm:block">
            <ChevronRightIcon class="w-5 h-5 stroke-2" />
          </button>
        </div>
      </section>

      <!-- SLOT WAKTU -->
      <section v-if="selectedDate">
        <h2 class="text-lg font-bold text-nandur-text px-2 mb-4 flex items-center gap-2">
          <ClockIcon class="w-5 h-5 text-nandur-green" />
          Pilih Sesi untuk {{ selectedDate.fullDayName }} {{ selectedDate.date }}/{{ selectedDate.dateObj.getMonth() + 1 }}
          <span v-if="selectedDate.isToday" class="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-1">(Hari ini)</span>
        </h2>
        
        <div v-if="isFetchingAvailability" class="flex flex-col items-center justify-center p-8 text-nandur-green/70">
          <div class="animate-spin rounded-full h-8 w-8 border-4 border-nandur-green/30 border-t-nandur-green mb-3"></div>
          <p class="text-sm font-medium animate-pulse">Mengecek ketersediaan jadwal...</p>
        </div>

        <div v-else class="flex flex-col gap-3 px-1">
          <div 
            v-for="slot in slots" 
            :key="slot.id"
            @click="checkAvailability(selectedDate.fullDateStr, slot) && openModal(slot)"
            class="relative overflow-hidden rounded-xl p-6 border transition-all duration-300 group flex items-center justify-between"
            :class="[
              checkAvailability(selectedDate.fullDateStr, slot)
                ? 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-nandur-green/30 cursor-pointer'
                : 'bg-gray-50/80 border-gray-100 opacity-50 cursor-not-allowed'
            ]"
          >
            <div class="flex flex-col">
              <span class="text-xs font-bold uppercase tracking-wider mb-1" :class="checkAvailability(selectedDate.fullDateStr, slot) ? 'text-nandur-hover' : 'text-gray-400'">Sesi {{ slot.time }}</span>
              <span class="text-xl font-bold" :class="checkAvailability(selectedDate.fullDateStr, slot) ? 'text-nandur-text' : 'text-gray-400 line-through decoration-gray-300 decoration-2'">{{ slot.label }}</span>
            </div>

            <div>
              <span v-if="checkAvailability(selectedDate.fullDateStr, slot)" class="inline-flex items-center text-nandur-green text-sm font-bold bg-nandur-green/5 px-4 py-1.5 rounded-full border border-nandur-green/10">
                Tersedia
              </span>
              <span v-else class="inline-flex items-center text-gray-400 text-sm font-bold bg-gray-100 px-4 py-1.5 rounded-full">
                Penuh
              </span>
            </div>
          </div>
        </div>
      </section>

    </main>

    <!-- Booking Modal -->
    <BookingModal 
      :isOpen="isModalOpen" 
      :selectedDate="selectedDate" 
      :selectedSlot="activeSlot"
      @close="isModalOpen = false"
      @submit="handleBookingSubmit"
    />

    <!-- Success Modal -->
    <div v-if="isSuccessModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div class="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center p-8 text-center transform transition-all scale-100">
        <div class="w-20 h-20 bg-nandur-green/10 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-sm">
          <svg class="w-10 h-10 text-nandur-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-2xl font-black text-nandur-text mb-2">Reservasi Berhasil!</h3>
        <p class="text-nandur-text/70 mb-8 text-sm leading-relaxed">
          Terima kasih, tempat Anda sudah kami siapkan. Sampai jumpa di Nandur Buku!
        </p>
        <button 
          @click="isSuccessModalOpen = false"
          class="w-full bg-nandur-green hover:bg-nandur-hover text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          Selesai
        </button>
      </div>
    </div>

    <!-- Sticky Footer Social -->
    <div class="fixed bottom-0 left-0 right-0 z-40 bg-nandur-surface/95 backdrop-blur-md border-t border-nandur-cream shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div class="w-full max-w-3xl mx-auto px-6 py-3 md:py-4 flex justify-around md:justify-center md:gap-24 items-center">
        <!-- Instagram -->
        <a href="https://www.instagram.com/nandurbuku/" target="_blank" class="text-gray-400 hover:text-[#E1306C] transition-colors hover:scale-110 transform duration-200" aria-label="Instagram">
          <svg class="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        </a>
        <!-- TikTok -->
        <a href="https://www.tiktok.com/@nandurbuku" target="_blank" class="text-gray-400 hover:text-black transition-colors hover:scale-110 transform duration-200" aria-label="TikTok">
          <svg class="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
        </a>
        <!-- WhatsApp -->
        <a href="https://wa.me/62895808920117" target="_blank" class="relative text-gray-400 hover:text-[#25D366] transition-colors hover:scale-110 transform duration-200" aria-label="WhatsApp">
          <!-- Notification Alert Dot -->
          <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5 md:h-3 md:w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-red-500 border border-white"></span>
          </span>
          <svg class="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
        <!-- Katalog Buku -->
        <a href="https://www.libib.com/u/nandurbuku" target="_blank" class="text-gray-400 hover:text-nandur-green transition-colors hover:scale-110 transform duration-200" aria-label="Katalog Buku">
          <svg class="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zm-1 15H7a.5.5 0 0 1-.5-.5v-13A.5.5 0 0 1 7 5h13v14z"/>
            <path d="M3 19.5V5a1 1 0 0 1 1-1h1V2H4a3 3 0 0 0-3 3v15a3 3 0 0 0 3 3h2v-2H4a1 1 0 0 1-1-1.5z"/>
          </svg>
        </a>
      </div>
    </div>

  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
