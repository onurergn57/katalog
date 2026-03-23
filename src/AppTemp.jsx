import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Plus, 
  Trash2, 
  Package, 
  Image as ImageIcon, 
  Video, 
  X,
  Search,
  Lock,
  Unlock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  PlayCircle,
  CheckCircle2,
  Edit,
  AlertTriangle
} from 'lucide-react';

// --- FİREBASE YAPILANDIRMASI ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyDkTRT9GbC2WLDRqd_pynQBik2Yq67yPLw",
      authDomain: "katalog-4212a.firebaseapp.com",
      projectId: "katalog-4212a",
      storageBucket: "katalog-4212a.firebasestorage.app",
      messagingSenderId: "827488717873",
      appId: "1:827488717873:web:15da360c29b5e6cf11d910"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'katalog-4212a';

const ADMIN_PASSWORD = "1234"; 
const MEDIA_LIMIT = 4; // Boyut sınırı nedeniyle 4 idealdir
const MAX_DOC_SIZE = 900000; // 1MB limitine güvenli mesafe (yaklaşık 900KB)

// --- Fiyat Formatlama ---
const formatPrice = (val) => {
  if (!val) return '';
  const number = val.toString().replace(/\D/g, '');
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// --- Gelişmiş Media Slider ---
const MediaSlider = ({ items = [], onCardClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!items || items.length === 0) return (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300" onClick={onCardClick}>
      <div className="flex flex-col items-center gap-2">
        <ImageIcon className="w-8 h-8 opacity-20" />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Görsel Yok</span>
      </div>
    </div>
  );

  const next = (e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % items.length); };
  const prev = (e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + items.length) % items.length); };

  const currentItem = items[currentIndex];

  return (
    <div className="relative w-full h-full group overflow-hidden bg-slate-50" onClick={onCardClick}>
      {currentItem?.type === 'video' ? (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <video src={currentItem.url} className="w-full h-full object-cover opacity-80" muted />
          <PlayCircle className="absolute w-12 h-12 text-white/80" />
        </div>
      ) : (
        <img 
          src={currentItem?.url} 
          alt="Ürün" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { e.target.src = "https://via.placeholder.com/400?text=Resim+Hatasi"; }}
        />
      )}
      
      {items.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white z-10">
            <ChevronLeft size={18} />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white z-10">
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState({ type: 'list', data: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [formData, setFormData] = useState({ title: '', code: '', price: '', description: '', media: [] });

  // 1. Auth İşlemi
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error(err); setIsLoading(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Ürünleri Çek
  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    
    const unsubscribe = onSnapshot(productsRef, async (snapshot) => {
      const productList = [];
      for (const docSnap of snapshot.docs) {
        const pData = docSnap.data();
        productList.push({ id: docSnap.id, ...pData, media: pData.media || [] });
      }
      const sorted = productList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setProducts(sorted);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Agresif Resim Sıkıştırma (Dosya boyutu hatasını önlemek için)
  const compressImage = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; // Genişliği 600px'e düşürdük
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Kaliteyi 0.5'e ( %50 ) çektik
        resolve(canvas.toDataURL('image/jpeg', 0.5)); 
      };
    });
  };

  // Toplam medya boyutunu hesapla
  const calculateMediaSize = (mediaArray) => {
    return mediaArray.reduce((acc, item) => acc + (item.url?.length || 0), 0);
  };

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    
    if (formData.media.length + files.length > MEDIA_LIMIT) {
      alert(`Limit Aşıldı: En fazla ${MEDIA_LIMIT} görsel ekleyebilirsiniz.`);
      return;
    }

    setIsUploading(true);
    let currentTempMedia = [...formData.media];

    for (const file of files) {
      const reader = new FileReader();
      const loadPromise = new Promise(resolve => {
        reader.onloadend = async () => {
          let finalUrl = reader.result;
          if (type === 'image') {
            finalUrl = await compressImage(reader.result);
          } else if (type === 'video') {
            // Videolar genelde sınırı anında aşar, uyarı verelim
            alert("Dikkat: Videolar dosya boyutu sınırını aşabilir. Lütfen çok kısa videolar yükleyin.");
          }

          const newMediaItem = { url: finalUrl, type };
          const potentialTotalSize = calculateMediaSize([...currentTempMedia, newMediaItem]);

          if (potentialTotalSize > MAX_DOC_SIZE) {
            alert("Veritabanı kapasite sınırı aşıldı! Lütfen daha az veya daha küçük resim ekleyin.");
          } else {
            currentTempMedia.push(newMediaItem);
            setFormData(prev => ({ ...prev, media: currentTempMedia }));
          }
          resolve();
        };
      });
      reader.readAsDataURL(file);
      await loadPromise;
    }
    setIsUploading(false);
    e.target.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    // Son bir kez boyut kontrolü
    const totalSize = JSON.stringify(formData).length;
    if (totalSize > 1048576) {
      alert("Bu ürün verisi çok büyük! Lütfen bazı resimleri kaldırın.");
      return;
    }

    setIsSubmitting(true);
    try {
      const productData = {
        title: formData.title,
        code: formData.code,
        price: formData.price,
        description: formData.description,
        media: formData.media,
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), {
          ...productData,
          createdAt: new Date().toISOString()
        });
      }

      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData({ title: '', code: '', price: '', description: '', media: [] });
      }, 500);
    } catch (err) {
      console.error(err);
      if (err.message?.includes('size')) {
        alert("Hata: Ürün boyutu çok büyük! Lütfen resim sayısını azaltın.");
      } else {
        alert("Kayıt sırasında bir hata oluştu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    if(!confirm('Ürünü silmek istediğinize emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
    } catch (err) { console.error(err); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase">Katalog Yükleniyor...</p>
      </div>
    );
  }

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 selection:bg-indigo-100">
      {/* Header */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-6 h-20 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView({ type: 'list', data: null })}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Package size={22} />
          </div>
          <span className="font-black text-lg tracking-tighter">PREMIUM KATALOG</span>
        </div>
        
        <button 
          onClick={() => isAdminLoggedIn ? setIsAdminLoggedIn(false) : setShowLoginModal(true)} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[10px] tracking-widest uppercase transition-all ${isAdminLoggedIn ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}
        >
          {isAdminLoggedIn ? <Lock size={14} /> : <Unlock size={14} />}
          {isAdminLoggedIn ? 'Çıkış Yap' : 'Yönetici'}
        </button>
      </nav>

      {view.type === 'list' ? (
        <div className="max-w-7xl mx-auto p-6 md:p-12">
          {/* Arama ve Ekleme */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-12">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-semibold" 
                placeholder="Ürün veya kod ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {isAdminLoggedIn && (
              <button 
                onClick={() => { setEditingProduct(null); setFormData({ title: '', code: '', price: '', description: '', media: [] }); setIsModalOpen(true); }}
                className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                <Plus size={18} /> YENİ ÜRÜN EKLE
              </button>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:shadow-2xl transition-all group flex flex-col h-full">
                <div className="aspect-square bg-slate-50 relative cursor-pointer overflow-hidden">
                  <MediaSlider items={product.media} onCardClick={() => setView({ type: 'detail', data: product })} />
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{product.title}</h3>
                  <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-4">{product.code || 'Özel Seri'}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-indigo-600 font-black text-xl">{product.price} ₺</span>
                    {isAdminLoggedIn && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingProduct(product); setFormData(product); setIsModalOpen(true); }} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"><Edit size={16} /></button>
                        <button onClick={() => deleteProduct(product.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Detay Sayfası */
        <div className="max-w-6xl mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-bottom-4">
          <button onClick={() => setView({ type: 'list', data: null })} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] tracking-widest uppercase mb-8 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={16} /> Geri Dön
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              {view.data.media?.map((m, i) => (
                <div key={i} className="rounded-3xl overflow-hidden shadow-lg border border-slate-100">
                  {m.type === 'video' ? <video src={m.url} controls className="w-full" /> : <img src={m.url} className="w-full object-cover" />}
                </div>
              ))}
            </div>
            
            <div className="space-y-8 lg:sticky lg:top-32 h-fit">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[10px] tracking-widest uppercase">{view.data.code}</span>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{view.data.title}</h1>
                <div className="text-3xl font-black text-indigo-600">{view.data.price} ₺</div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">Ürün Detayları</h4>
                <p className="text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{view.data.description || 'Açıklama bulunmuyor.'}</p>
              </div>
              <button onClick={() => setView({ type: 'list', data: null })} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-black transition-all">Listeye Geri Dön</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ürün Ekle/Düzenle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tighter uppercase">{editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <input required className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-indigo-300 font-bold" placeholder="Ürün Adı" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-indigo-300 font-bold" placeholder="Kod" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                <input required className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-indigo-300 font-black text-indigo-600" placeholder="Fiyat" value={formData.price} onChange={e => setFormData({...formData, price: formatPrice(e.target.value)})} />
              </div>
              
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex justify-center gap-4">
                    <label className="cursor-pointer px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-[10px] tracking-widest uppercase hover:bg-slate-50 flex items-center gap-2">
                      <ImageIcon size={16} /> Fotoğraf
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'image')} />
                    </label>
                    <label className="cursor-pointer px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-[10px] tracking-widest uppercase hover:bg-slate-50 flex items-center gap-2">
                      <Video size={16} /> Video (Kısa)
                      <input type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e, 'video')} />
                    </label>
                  </div>
                  
                  {/* Kapasite Göstergesi */}
                  <div className="w-full max-w-xs bg-slate-100 h-1 rounded-full overflow-hidden mt-2">
                    <div 
                      className={`h-full transition-all ${calculateMediaSize(formData.media) > MAX_DOC_SIZE * 0.8 ? 'bg-orange-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${Math.min(100, (calculateMediaSize(formData.media) / MAX_DOC_SIZE) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Kapasite Kullanımı</p>
                </div>

                {formData.media.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {formData.media.map((m, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow">
                        {m.type === 'image' ? <img src={m.url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white"><PlayCircle size={12}/></div>}
                        <button type="button" onClick={() => setFormData({...formData, media: formData.media.filter((_, idx) => idx !== i)})} className="absolute inset-0 bg-red-500/80 text-white opacity-0 hover:opacity-100 flex items-center justify-center transition-all"><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {isUploading && <p className="text-[10px] font-bold text-indigo-600 animate-pulse uppercase">Medya İşleniyor...</p>}
              </div>

              <textarea className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-indigo-300 min-h-[100px] font-medium text-sm" placeholder="Ürün açıklaması..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />

              <button type="submit" disabled={isSubmitting || isUploading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-xl shadow-indigo-100 disabled:bg-slate-200">
                {isSubmitting ? 'KAYDEDİLİYOR...' : 'ÜRÜNÜ KAYDET'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Şifre Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-10 w-full max-sm:px-6 max-w-sm text-center">
            <Lock size={40} className="mx-auto mb-4 text-indigo-600" />
            <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Yönetici Paneli</h2>
            <form onSubmit={e => { e.preventDefault(); if(passwordInput === ADMIN_PASSWORD) { setIsAdminLoggedIn(true); setShowLoginModal(false); setPasswordInput(''); } else alert('Hatalı Şifre!'); }} className="space-y-4">
              <input type="password" placeholder="Şifre" className="w-full p-4 bg-slate-50 rounded-xl text-center text-xl font-bold border outline-none" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-indigo-100">Giriş</button>
              <button type="button" onClick={() => setShowLoginModal(false)} className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">İptal</button>
            </form>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-10 z-[200]">
          <CheckCircle2 size={18} />
          <span className="font-bold text-xs uppercase tracking-widest">Kayıt Başarılı</span>
        </div>
      )}
    </div>
  );
};

export default App;
