<script setup>
import { ref } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { GAS_URL } from '../config.js'

const props = defineProps({
  isOpen: Boolean,
  selectedDate: Object,
  selectedSlot: Object
})

const emit = defineEmits(['close', 'submit'])

const form = ref({
  nama: '',
  usia: '',
  email: '',
  wa: '',
  tamu: '1',
  sumber: '',
  domisili: ''
})

const isLoading = ref(false)
const waError = ref('')

const handleSubmit = async () => {
  waError.value = ''
  
  // Validasi nomor WhatsApp: hanya angka, minimal 10 digit, maksimal 14 digit
  const waRegex = /^[0-9]{10,14}$/
  if (!waRegex.test(form.value.wa)) {
    waError.value = 'Nomor WhatsApp tidak valid! Masukkan 10-14 digit angka.'
    return
  }

  isLoading.value = true
  
  try {
    const payload = {
      action: 'book',
      tanggal: props.selectedDate.fullDateStr,
      slot: `${props.selectedSlot.time} (${props.selectedSlot.label})`,
      ...form.value
    }
    
    // Menggunakan text/plain untuk mencegah preflight CORS dari browser ke server GAS
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    })
    
    const json = await res.json()
    
    if (json.success) {
      // Sukses
      emit('submit', form.value)
      
      // Kosongkan form untuk submit berikutnya
      form.value = {
        nama: '',
        usia: '',
        email: '',
        wa: '',
        tamu: '1',
        sumber: '',
        domisili: ''
      }
    } else {
      // Gagal (contoh: slot keduluan orang atau nomor WA sudah ada)
      alert(json.message || 'Gagal mengirim reservasi. Silakan coba lagi.')
    }
  } catch (error) {
    console.error("Error submitting booking:", error)
    alert("Terjadi kesalahan jaringan. Silakan periksa koneksi Anda dan coba lagi.")
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="modal-content bg-nandur-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
      
      <!-- Header Modal -->
      <div class="flex justify-between items-center p-5 border-b border-nandur-green/20">
        <div>
          <h2 class="text-xl font-bold text-nandur-green">Formulir Reservasi</h2>
          <p class="text-xs text-nandur-text/70 mt-1">
            {{ selectedDate?.dayName }}, {{ selectedDate?.date }} {{ selectedDate?.monthName }} | {{ selectedSlot?.label }}
          </p>
        </div>
        <button @click="$emit('close')" class="p-1 rounded-full hover:bg-nandur-green/10 text-nandur-text transition-colors">
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Form Body (Scrollable) -->
      <div class="p-5 overflow-y-auto flex-1">
        <form @submit.prevent="handleSubmit" id="bookingForm" class="space-y-4">
          
          <div>
            <label class="block text-sm font-medium text-nandur-text mb-1">Nama Lengkap</label>
            <input v-model="form.nama" type="text" required class="w-full px-4 py-2 rounded-lg border border-nandur-green/30 bg-white focus:outline-none focus:ring-2 focus:ring-nandur-green/50 text-nandur-text" placeholder="Masukkan nama lengkap">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-nandur-text mb-1">Usia</label>
              <input v-model="form.usia" type="number" required min="1" class="w-full px-4 py-2 rounded-lg border border-nandur-green/30 bg-white focus:outline-none focus:ring-2 focus:ring-nandur-green/50 text-nandur-text" placeholder="Contoh: 24">
            </div>
            <div>
              <label class="block text-sm font-medium text-nandur-text mb-1">Jumlah Tamu</label>
              <select v-model="form.tamu" required class="w-full px-4 py-2 rounded-lg border border-nandur-green/30 bg-white focus:outline-none focus:ring-2 focus:ring-nandur-green/50 text-nandur-text">
                <option value="1">1 Orang</option>
                <option value="2">2 Orang</option>
                <option value="3">3 Orang</option>
                <option value="4">4 Orang (Maks)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-nandur-text mb-1">Nomor WhatsApp</label>
            <input 
              v-model="form.wa" 
              type="tel" 
              required 
              @input="waError = ''"
              class="w-full px-4 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 text-nandur-text transition-colors" 
              :class="waError ? 'border-red-400 focus:ring-red-400/50' : 'border-nandur-green/30 focus:ring-nandur-green/50'"
              placeholder="Contoh: 08123456789"
            >
            <p v-if="waError" class="text-red-500 text-xs mt-1.5 font-medium">{{ waError }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-nandur-text mb-1">Email</label>
            <input v-model="form.email" type="email" required class="w-full px-4 py-2 rounded-lg border border-nandur-green/30 bg-white focus:outline-none focus:ring-2 focus:ring-nandur-green/50 text-nandur-text" placeholder="Masukkan email aktif">
          </div>

          <div>
            <label class="block text-sm font-medium text-nandur-text mb-1">Tahu Nandur Buku Dari Mana?</label>
            <select v-model="form.sumber" required class="w-full px-4 py-2 rounded-lg border border-nandur-green/30 bg-white focus:outline-none focus:ring-2 focus:ring-nandur-green/50 text-nandur-text">
              <option value="" disabled>Pilih salah satu</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="Teman/Keluarga">Teman / Keluarga</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-nandur-text mb-1">Domisili</label>
            <select v-model="form.domisili" required class="w-full px-4 py-2 rounded-lg border border-nandur-green/30 bg-white focus:outline-none focus:ring-2 focus:ring-nandur-green/50 text-nandur-text">
              <option value="" disabled>Pilih domisili</option>
              <option value="Jakarta Pusat">Jakarta Pusat</option>
              <option value="Jakarta Selatan">Jakarta Selatan</option>
              <option value="Jakarta Barat">Jakarta Barat</option>
              <option value="Jakarta Timur">Jakarta Timur</option>
              <option value="Jakarta Utara">Jakarta Utara</option>
              <option value="Luar Jakarta">Luar Jakarta</option>
            </select>
          </div>
        </form>
      </div>

      <!-- Footer Modal -->
      <div class="p-5 border-t border-nandur-green/20 bg-nandur-surface/50">
        <button 
          type="submit" 
          form="bookingForm" 
          :disabled="isLoading"
          class="w-full py-3 rounded-xl font-bold text-white transition-all duration-300 shadow-md flex items-center justify-center"
          :class="isLoading ? 'bg-nandur-green/70 cursor-not-allowed' : 'bg-nandur-green hover:bg-nandur-hover hover:shadow-lg'"
        >
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isLoading ? 'Memproses...' : 'Reservasi Sekarang' }}
        </button>
      </div>

    </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
