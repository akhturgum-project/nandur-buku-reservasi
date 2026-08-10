<script setup>
import { ref, computed, onMounted } from 'vue'
import { GAS_URL } from '../config.js'

// State Autentikasi
const pin = ref('')
const isAuthenticated = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')

// State Data
const bookings = ref([])
const isActionLoading = ref(false)

// State Navigasi Dashboard
const activeTab = ref('reservasi') // 'reservasi' | 'libur'

// State Form Blokir
const blockDate = ref('')
const isBlocking = ref(false)

// Formatting
const formatDateIndo = (dateStr) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', options)
}

const handleLogin = async () => {
  if (!pin.value) {
    errorMsg.value = "PIN tidak boleh kosong!"
    return
  }
  
  isLoading.value = true
  errorMsg.value = ""
  
  try {
    const res = await fetch(`${GAS_URL}?t=${new Date().getTime()}&pin=${pin.value}`)
    const json = await res.json()
    
    if (json.success && json.data) {
      // Verifikasi PIN dengan mengecek ketersediaan kolom rahasia 'nama' (jika ada data)
      if (json.data.length > 0 && !json.data[0].nama) {
        errorMsg.value = "PIN yang Anda masukkan salah!"
      } else {
        // Parse tanggal untuk mengatasi zona waktu UTC dari GAS
        let parsedBookings = json.data.map(b => {
          const dateObj = new Date(b.tanggal)
          dateObj.setUTCHours(dateObj.getUTCHours() + 12)
          return {
            ...b,
            tanggalAsli: dateObj.toISOString().split('T')[0]
          }
        })
        
        // Urutkan dari yang terbaru/mendatang
        parsedBookings.sort((a, b) => new Date(b.tanggalAsli) - new Date(a.tanggalAsli))
        
        bookings.value = parsedBookings
        isAuthenticated.value = true
      }
    } else {
      errorMsg.value = "Gagal mengambil data dari server."
    }
  } catch (err) {
    errorMsg.value = "Koneksi terputus. Pastikan Anda terhubung ke internet."
  } finally {
    isLoading.value = false
  }
}

const sendReminder = (booking) => {
  let phone = String(booking.wa || '').trim()
  if (!phone || phone === '0') return
  
  // Bersihkan karakter non-angka jika ada
  phone = phone.replace(/\D/g, '')
  
  // Format ke 628xxx
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1)
  } else if (phone.startsWith('8')) {
    phone = '62' + phone
  }
  
  const text = `Halo Kak ${booking.nama}, mengingatkan jadwal kunjungan ke perpustakaan Nandur Buku untuk besok hari pada sesi ${booking.slot}. Jangan lupa datang tepat waktu ya kak, sampai jumpa!`
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank')
}

const handleCancel = async (booking) => {
  if (!confirm(`YAKIN Batal? Pesanan atas nama ${booking.nama} akan dibatalkan dan slot kembali tersedia untuk umum.`)) return
  
  isActionLoading.value = true
  try {
    const payload = {
      action: 'cancel',
      pin: pin.value,
      tanggal: booking.tanggalAsli,
      slot: booking.slot,
      wa: booking.wa
    }
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    const json = await res.json()
    
    if (json.success) {
      alert("Pesanan berhasil dibatalkan!")
      await handleLogin() // Refresh data otomatis
    } else {
      alert("Gagal: " + json.message)
    }
  } catch (err) {
    alert("Gagal membatalkan. Periksa koneksi Anda.")
  } finally {
    isActionLoading.value = false
  }
}

const handleBlockDay = async () => {
  if (!blockDate.value) {
    alert("Pilih tanggal terlebih dahulu!")
    return
  }
  
  if (!confirm(`YAKIN LIBUR? Tanggal ${formatDateIndo(blockDate.value)} akan diblokir seluruh sesinya dari publik.`)) return
  
  isBlocking.value = true
  try {
    const slotsToBlock = [
      'Siang (12:00 - 14:00 WIB)',
      'Sore (14:00 - 16:00 WIB)',
      'Petang (16:00 - 18:00 WIB)'
    ]
    
    let successCount = 0
    for (const slot of slotsToBlock) {
      // Cek apakah sudah ada di list (agar tidak nembak 2x kalau sudah ada yg pesan)
      const isAlreadyTaken = bookings.value.find(b => b.tanggalAsli === blockDate.value && b.slot === slot)
      if (isAlreadyTaken) {
        successCount++
        continue
      }
      
      const payload = {
        action: 'book',
        tanggal: blockDate.value,
        slot: slot,
        nama: 'TUTUP (LIBUR)',
        usia: '0',
        email: 'libur@nandurbuku.com',
        wa: '0000000000',
        tamu: '0',
        sumber: 'Admin',
        domisili: 'Admin',
        pin: pin.value
      }
      
      await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) })
      successCount++
    }
    
    if (successCount > 0) {
      alert(`Tanggal ${formatDateIndo(blockDate.value)} sukses diblokir!`)
      blockDate.value = ''
      await handleLogin() // Refresh
    }
  } catch (err) {
    alert("Gagal memblokir hari.")
  } finally {
    isBlocking.value = false
  }
}

// Filter Bulan
const selectedMonth = ref('Semua')
const isDropdownOpen = ref(false)

const selectMonth = (val) => {
  selectedMonth.value = val
  isDropdownOpen.value = false
}

const availableMonths = computed(() => {
  const monthsMap = new Map()
  bookings.value.forEach(b => {
    if (b.nama && b.nama !== 'TUTUP (LIBUR)') {
      const monthStr = b.tanggalAsli.substring(0, 7) // Format YYYY-MM
      if (!monthsMap.has(monthStr)) {
        const d = new Date(b.tanggalAsli)
        const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        monthsMap.set(monthStr, label)
      }
    }
  })
  // Urutkan menurun (terbaru di atas)
  return Array.from(monthsMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(entry => ({ value: entry[0], label: entry[1] }))
})

// Computed: Filter bookings yang aktif, bukan fiktif, dan sesuai bulan yang dipilih
const realBookings = computed(() => {
  let filtered = bookings.value.filter(b => b.nama && b.nama !== 'TUTUP (LIBUR)')
  
  if (selectedMonth.value !== 'Semua') {
    filtered = filtered.filter(b => b.tanggalAsli.startsWith(selectedMonth.value))
  }
  
  return filtered
})
</script>

<template>
  <div class="min-h-screen bg-[#FDFBF7] font-sans text-nandur-text flex flex-col md:flex-row">
    
    <!-- LAYAR LOGIN -->
    <div v-if="!isAuthenticated" class="flex-1 flex flex-col justify-center items-center p-6">
      <div class="w-full max-w-md bg-white rounded-3xl p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-nandur-cream text-center">
        <div class="w-20 h-20 bg-nandur-cream rounded-2xl flex items-center justify-center mx-auto mb-6">
          <img src="/nandur-buku-icon.webp" alt="Nandur Buku" class="w-12 h-12 object-contain" />
        </div>
        <h1 class="text-2xl font-black mb-2 text-nandur-green">Ruang Admin</h1>
        <p class="text-gray-500 mb-8 text-sm">Masukkan PIN rahasia untuk mengakses data reservasi.</p>
        
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <input 
              type="password" 
              v-model="pin"
              placeholder="••••••"
              class="w-full text-center tracking-[0.5em] font-black text-2xl px-5 py-4 border-2 border-nandur-cream rounded-xl focus:border-nandur-green focus:ring-4 focus:ring-nandur-green/10 outline-none transition-all bg-[#FDFBF7]"
            />
          </div>
          <p v-if="errorMsg" class="text-red-500 text-sm font-bold animate-pulse">{{ errorMsg }}</p>
          
          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full bg-nandur-green hover:bg-nandur-hover text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            <span v-if="isLoading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ isLoading ? 'Membuka...' : 'Buka Brankas' }}
          </button>
        </form>
      </div>
    </div>

    <!-- DASHBOARD -->
    <template v-else>
      <!-- Sidebar / Bottom Nav (Mobile) -->
      <aside class="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-nandur-cream shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-row md:flex-col justify-between md:min-h-screen sticky top-0 z-20 overflow-x-auto md:overflow-visible no-scrollbar">
        <div class="p-4 md:p-8 flex md:flex-col items-center md:items-start gap-4 md:gap-8 w-full">
          <!-- Logo -->
          <div class="flex items-center gap-3 shrink-0">
            <div class="w-10 h-10 bg-nandur-cream rounded-xl flex items-center justify-center shadow-sm">
              <img src="/nandur-buku-icon.webp" alt="Logo" class="w-6 h-6 object-contain" />
            </div>
            <h1 class="font-black text-xl text-nandur-green hidden md:block">Nandur Admin</h1>
          </div>

          <!-- Menu Navigasi -->
          <nav class="flex flex-row md:flex-col gap-2 w-full">
            <button 
              @click="activeTab = 'reservasi'"
              :class="activeTab === 'reservasi' ? 'bg-nandur-green text-white shadow-md' : 'text-gray-500 hover:bg-nandur-cream/50'"
              class="px-4 md:px-5 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shrink-0 whitespace-nowrap"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Daftar Reservasi
            </button>

            <button 
              @click="activeTab = 'libur'"
              :class="activeTab === 'libur' ? 'bg-nandur-green text-white shadow-md' : 'text-gray-500 hover:bg-nandur-cream/50'"
              class="px-4 md:px-5 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shrink-0 whitespace-nowrap"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Blokir Hari
            </button>
          </nav>
        </div>

        <div class="p-4 md:p-8 shrink-0 flex items-center">
          <button @click="isAuthenticated = false; pin = ''" class="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-3 rounded-xl transition-all w-full">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            <span class="hidden md:inline">Keluar</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-5 md:p-10 max-h-screen overflow-y-auto bg-[#FDFBF7]">
        
        <!-- Tab: Daftar Reservasi -->
        <div v-if="activeTab === 'reservasi'" class="w-full max-w-6xl mx-auto space-y-6">
          <div class="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
            <div>
              <h2 class="text-3xl font-black text-nandur-green mb-2">Daftar Reservasi</h2>
              <p class="text-gray-500">Kelola dan pantau seluruh tamu yang akan berkunjung.</p>
            </div>
            
            <div class="flex items-center gap-3 relative">
              
              <!-- Custom Dropdown Filter Bulan -->
              <div class="relative z-50">
                <!-- Overlay penutup dropdown -->
                <div v-if="isDropdownOpen" @click="isDropdownOpen = false" class="fixed inset-0 z-40"></div>
                
                <!-- Trigger Button -->
                <button 
                  @click="isDropdownOpen = !isDropdownOpen"
                  class="relative z-50 bg-white px-5 py-3 rounded-xl shadow-sm border border-nandur-cream text-nandur-text font-semibold flex items-center justify-between min-w-[170px] hover:border-nandur-green/30 transition-colors"
                >
                  <span class="truncate pr-3">{{ selectedMonth === 'Semua' ? 'Semua Waktu' : availableMonths.find(m => m.value === selectedMonth)?.label || 'Semua Waktu' }}</span>
                  <svg class="w-4 h-4 text-gray-400 transition-transform duration-300" :class="{ 'rotate-180': isDropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>

                <!-- Dropdown Menu -->
                <transition
                  enter-active-class="transition ease-out duration-200"
                  enter-from-class="opacity-0 translate-y-1 scale-95"
                  enter-to-class="opacity-100 translate-y-0 scale-100"
                  leave-active-class="transition ease-in duration-150"
                  leave-from-class="opacity-100 translate-y-0 scale-100"
                  leave-to-class="opacity-0 translate-y-1 scale-95"
                >
                  <ul 
                    v-if="isDropdownOpen"
                    class="absolute right-0 md:left-0 top-[110%] mt-1 w-full min-w-[170px] bg-white border border-gray-100 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] py-2 z-50 overflow-hidden origin-top"
                  >
                    <li 
                      @click="selectMonth('Semua')"
                      class="px-5 py-2.5 hover:bg-nandur-cream/30 cursor-pointer transition-colors text-sm font-bold flex items-center justify-between"
                      :class="selectedMonth === 'Semua' ? 'text-nandur-green bg-nandur-green/5' : 'text-nandur-text/70'"
                    >
                      Semua Waktu
                      <svg v-if="selectedMonth === 'Semua'" class="w-4 h-4 text-nandur-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </li>
                    <li 
                      v-for="m in availableMonths" 
                      :key="m.value"
                      @click="selectMonth(m.value)"
                      class="px-5 py-2.5 hover:bg-nandur-cream/30 cursor-pointer transition-colors text-sm font-bold flex items-center justify-between"
                      :class="selectedMonth === m.value ? 'text-nandur-green bg-nandur-green/5' : 'text-nandur-text/70'"
                    >
                      {{ m.label }}
                      <svg v-if="selectedMonth === m.value" class="w-4 h-4 text-nandur-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </li>
                  </ul>
                </transition>
              </div>

              <!-- Tombol Refresh -->
              <button @click="handleLogin" class="relative z-10 bg-white p-3 rounded-xl shadow-sm border border-nandur-cream text-nandur-green hover:rotate-180 transition-all duration-500 shrink-0" title="Refresh Data">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </button>
            </div>
          </div>

          <div v-if="realBookings.length === 0" class="bg-white border-2 border-dashed border-nandur-cream rounded-3xl p-12 text-center">
            <p class="text-gray-400 font-bold text-lg">Belum ada reservasi aktif saat ini.</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <!-- Card Tamu -->
            <div v-for="(b, idx) in realBookings" :key="idx" class="bg-white rounded-2xl p-5 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-shadow">
              
              <!-- Header Card -->
              <div class="mb-3 border-b border-gray-100 pb-3 flex flex-col gap-2 overflow-hidden">
                <h3 class="text-base font-black text-nandur-text leading-tight truncate">{{ b.nama }}</h3>
                <div class="flex gap-2 items-center w-full">
                  <p class="text-nandur-green font-bold text-[10px] bg-nandur-green/10 px-2.5 py-1 rounded-lg truncate min-w-0">{{ formatDateIndo(b.tanggalAsli) }}</p>
                  <p class="bg-nandur-cream text-nandur-hover font-bold text-[10px] px-2 py-1 rounded-lg border border-nandur-cream/80 truncate min-w-0">
                    {{ b.slot }}
                  </p>
                </div>
              </div>

              <!-- Info Detail -->
              <div class="grid grid-cols-2 gap-y-3 gap-x-2 text-xs text-gray-600 mb-5 flex-1">
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Jumlah Tamu</p>
                  <p class="font-semibold text-nandur-text">{{ b.tamu }} Org</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Domisili</p>
                  <p class="font-semibold text-nandur-text truncate" :title="b.domisili">{{ b.domisili || '-' }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase mb-0.5">WhatsApp</p>
                  <p class="font-semibold text-nandur-text truncate" :title="b.wa">{{ b.wa }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Sumber Info</p>
                  <p class="font-semibold text-nandur-text truncate" :title="b.sumber">{{ b.sumber || '-' }}</p>
                </div>
                <div class="col-span-2 mt-1">
                  <p class="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Email</p>
                  <p class="font-semibold text-nandur-text truncate" :title="b.email">{{ b.email || '-' }}</p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-2 text-xs">
                <button 
                  @click="sendReminder(b)"
                  class="flex-1 bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Pengingat
                </button>
                <button 
                  @click="handleCancel(b)"
                  :disabled="isActionLoading"
                  class="flex-[0.4] bg-white border border-red-200 text-red-500 hover:bg-red-50 font-bold py-2 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: Blokir Hari -->
        <div v-else-if="activeTab === 'libur'" class="w-full max-w-2xl mx-auto space-y-6">
          <div class="mb-8">
            <h2 class="text-3xl font-black text-nandur-green mb-2">Kelola Hari Libur</h2>
            <p class="text-gray-500">Tutup semua sesi (Siang, Sore, Petang) secara paksa pada tanggal tertentu.</p>
          </div>

          <div class="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-nandur-cream">
            <label class="block text-nandur-text font-bold mb-3 text-lg">Pilih Tanggal Tutup</label>
            <input 
              type="date" 
              v-model="blockDate"
              class="w-full text-lg px-5 py-4 border-2 border-nandur-cream rounded-xl focus:border-nandur-green focus:ring-4 focus:ring-nandur-green/10 outline-none transition-all mb-8"
            />
            
            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-8 flex gap-4 text-sm text-yellow-800">
              <svg class="w-6 h-6 shrink-0 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <p>Tindakan ini akan membuat reservasi "fiktif" di semua sesi pada tanggal tersebut. Pengunjung umum akan melihat status slot sebagai "Penuh".</p>
            </div>

            <button 
              @click="handleBlockDay"
              :disabled="isBlocking || !blockDate"
              class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-lg"
            >
              <span v-if="isBlocking" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Kunci Hari Ini
            </button>
          </div>
        </div>

      </main>
    </template>
  </div>
</template>

<style scoped>
/* Sembunyikan scrollbar tapi tetap bisa scroll */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
