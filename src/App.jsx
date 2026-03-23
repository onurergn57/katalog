import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  updateDoc,
  query,
  orderBy
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
  Edit3, 
  Package, 
  Image as ImageIcon, 
  Video, 
  X,
  Search,
  Share2,
  Lock,
  Unlock,
  Upload,
  Link as LinkIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  PlayCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'portfolio-advanced-v3';

const ADMIN_PASSWORD = "1234"; 

// --- Yardımcı Fonksiyonlar ---

const formatPrice = (val) => {
  if (!val) return '';
  const number = val.toString().replace(/\D/g, '');
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Yaklaşık veri boyutu hesaplama (byte cinsinden)
const calculateDataSize = (data) => {
  return new TextEncoder().encode(JSON.stringify(data)).length;
};

const MediaSlider = ({ items = [], onCardClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!items || items.length === 0) return (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
      <ImageIcon className="w-12 h-12" />
    </div>
  );

  const next = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const currentItem = items[currentIndex];

  return (
    <div className="relative w-full h-full group overflow-hidden" onClick={onCardClick}>
      {currentItem.type === 'video' ? (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <video src={currentItem.url} className="w-full h-full object-cover opacity-60" muted />
          <PlayCircle className="absolute w-12 h-12 text-white opacity-80" />
        </div>
      ) : (
        <img 
          src={currentItem.url} 
          alt="Medya" 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { e.target.src = "https://via.placeholder.com/400x300?text=Resim+Yuklenemedi"; }}
        />
      )}

      {items.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-1.5 rounded-full text-white transition-all opacity-0 group-hover:opacity-100">
            <ChevronLeft size={20} />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-1.5 rounded-full text-white transition-all opacity-0 group-hover:opacity-100">
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {items.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-4 bg-white' : 'w-1 bg-white/50'}`} />
            ))}
          </div>
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

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    price: '',
    description: '',
    media: [],
  });

  // Mevcut form boyutunu hesapla
  const currentSize = calculateDataSize(formData);
  const sizeLimit = 1000000; // ~1MB
  const sizePercentage = Math.min((currentSize / sizeLimit) * 100, 100);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth hatası:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Hatası:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ürün Kataloğu',
          text: 'Ürünlerimize göz atın!',
          url: window.location.href,
        });
      } catch (err) { console.error(err); }
    } else {
      const dummy = document.createElement("input");
      document.body.appendChild(dummy);
      dummy.value = window.location.href;
      dummy.select();
      document.execCommand("copy");
      document.body.removeChild(dummy);
      alert("Link kopyalandı!");
    }
  };

  const compressImage = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; // Daha küçük genişlik
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
        resolve(canvas.toDataURL('image/jpeg', 0.4)); // Daha yüksek sıkıştırma (0.4)
      };
    });
  };

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    
    // Boyut kontrolü
    if (currentSize > sizeLimit * 0.9) {
      alert("Ürün kapasitesi dolmak üzere! Lütfen bazı medyaları silin veya link kullanın.");
      return;
    }

    setIsUploading(true);
    for (const file of files) {
      if (type === 'video' && file.size > 800000) { // Video için çok daha sıkı sınır
        alert("Video dosyası çok büyük! 800KB altı videolar yükleyebilir veya link ekleyebilirsiniz.");
        continue;
      }
      
      const reader = new FileReader();
      const loadPromise = new Promise(resolve => {
        reader.onloadend = async () => {
          let finalUrl = reader.result;
          if (type === 'image') finalUrl = await compressImage(reader.result);
          
          setFormData(prev => {
            const newMedia = [...prev.media, { url: finalUrl, type }];
            if (calculateDataSize({...prev, media: newMedia}) > sizeLimit) {
              alert("Bu dosya eklendiğinde 1MB sınırı aşılıyor! İşlem iptal edildi.");
              return prev;
            }
            return { ...prev, media: newMedia };
          });
          resolve();
        };
      });
      reader.readAsDataURL(file);
      await loadPromise;
    }
    setIsUploading(false);
  };

  const addMediaByLink = (type) => {
    const url = prompt(`${type === 'image' ? 'Resim' : 'Video'} URL adresini girin:`);
    if (url) {
      setFormData(prev => ({
        ...prev,
        media: [...prev.media, { url, type }]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (currentSize > sizeLimit) {
      alert("Hata: Ürün verisi 1MB sınırını aşıyor. Lütfen bazı görselleri çıkarın.");
      return;
    }

    setIsSubmitting(true);
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingProduct.id), formData);
      } else {
        await addDoc(productsRef, { ...formData, createdAt: new Date().toISOString() });
      }
      
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        closeModal();
      }, 1500);

    } catch (err) {
      console.error(err);
      alert("Kritik Hata: Veri boyutu hala çok büyük. Lütfen daha az veya daha küçük görseller kullanın.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ title: '', code: '', price: '', description: '', media: [] });
  };

  const filteredProducts = products.filter(p => 
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10 font-sans">
      {/* Başarı Mesajı */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in duration-300">
          <CheckCircle2 size={20} />
          <span className="font-bold">Ürün Başarıyla Kaydedildi!</span>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-4 h-16 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView({ type: 'list', data: null })}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Package className="text-white" size={24} />
          </div>
          <span className="font-black text-xl tracking-tight">DİJİTAL KATALOG</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Share2 size={20} /></button>
          <button onClick={() => isAdminLoggedIn ? setIsAdminLoggedIn(false) : setShowLoginModal(true)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            {isAdminLoggedIn ? <Lock className="text-red-500" size={20} /> : <Unlock size={20} />}
          </button>
        </div>
      </nav>

      {view.type === 'list' ? (
        <>
          <header className="max-w-7xl mx-auto px-4 py-12 text-center">
            <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">Koleksiyonu Keşfedin</h1>
            <p className="text-slate-500 mb-10 max-w-xl mx-auto">En yeni tasarımlarımız ve ürünlerimiz tek bir yerde.</p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <div className="relative flex-1 text-left">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  placeholder="Ürün adı veya kodu ile arayın..." 
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              {isAdminLoggedIn && (
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                  <Plus size={20} /> Yeni Ürün
                </button>
              )}
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col group">
                <div className="aspect-[4/3] bg-slate-100 relative">
                  <MediaSlider 
                    items={product.media} 
                    onCardClick={() => setView({ type: 'detail', data: product })} 
                  />
                </div>
                <div className="p-8 cursor-pointer" onClick={() => setView({ type: 'detail', data: product })}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl mb-1 group-hover:text-indigo-600 transition-colors">{product.title}</h3>
                      <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">{product.code || 'KOD BELİRTİLMEDİ'}</span>
                    </div>
                    <span className="text-indigo-600 font-black text-xl">{product.price} ₺</span>
                  </div>
                  <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">{product.description}</p>
                </div>
                {isAdminLoggedIn && (
                  <div className="px-8 pb-8 flex gap-3 justify-end">
                    <button onClick={() => { setEditingProduct(product); setFormData(product); setIsModalOpen(true); }} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={18} /></button>
                    <button onClick={async () => { if(confirm('Bu ürünü silmek istediğinize emin misiniz?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id)) }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>
            ))}
          </main>
        </>
      ) : (
        /* Detay Sayfası */
        <main className="max-w-6xl mx-auto px-4 py-12">
          <button onClick={() => setView({ type: 'list', data: null })} className="flex items-center gap-2 text-slate-500 font-bold mb-10 hover:text-indigo-600 transition-colors group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Listeye Geri Dön
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-6">
              {view.data.media?.map((m, i) => (
                <div key={i} className="rounded-[2.5rem] overflow-hidden bg-black shadow-2xl">
                  {m.type === 'video' ? (
                    <video src={m.url} controls className="w-full aspect-video outline-none" />
                  ) : (
                    <img 
                      src={m.url} 
                      alt="" 
                      className="w-full h-auto object-cover" 
                      onError={(e) => { e.target.src = "https://via.placeholder.com/800x600?text=Resim+Yuklenemedi"; }}
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="sticky top-28 h-fit space-y-8">
              <div>
                <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-4">
                  Stok Kodu: {view.data.code || 'BELİRTİLMEDİ'}
                </div>
                <h1 className="text-5xl font-black tracking-tight mb-4">{view.data.title}</h1>
                <div className="text-4xl font-black text-indigo-600">{view.data.price} ₺</div>
              </div>

              <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <h4 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-4">Ürün Bilgileri</h4>
                <p className="text-slate-600 leading-loose text-lg whitespace-pre-wrap">{view.data.description || 'Açıklama girilmemiş.'}</p>
              </div>
              
              <button onClick={handleShare} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200">
                <Share2 size={24} /> Ürünü Paylaş
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Kayıt Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative scrollbar-hide">
            {isSubmitting && (
              <div className="absolute inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-[3rem]">
                <Loader2 className="animate-spin text-indigo-600 w-12 h-12 mb-4" />
                <p className="font-bold text-lg">Buluta Kaydediliyor...</p>
              </div>
            )}
            
            <div className="p-10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black">{editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h2>
                <button onClick={closeModal} className="p-3 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
              </div>

              {/* Boyut Çubuğu */}
              <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ürün Kapasitesi (Max 1MB)</span>
                    <span className={`text-[10px] font-black ${sizePercentage > 85 ? 'text-red-500' : 'text-indigo-600'}`}>%{sizePercentage.toFixed(1)}</span>
                 </div>
                 <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${sizePercentage > 85 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${sizePercentage}%` }}></div>
                 </div>
                 {sizePercentage > 80 && (
                   <div className="flex items-center gap-2 mt-2 text-red-500">
                     <AlertTriangle size={12} />
                     <span className="text-[9px] font-bold">Doküman sınırı dolmak üzere! Lütfen link kullanmayı deneyin.</span>
                   </div>
                 )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ürün Başlığı</label>
                  <input required placeholder="Ürün adını giriniz" className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Katalog Kodu</label>
                    <input placeholder="KLT-XXX" className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Fiyat (₺)</label>
                    <input 
                      required
                      placeholder="0" 
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" 
                      value={formData.price} 
                      onChange={e => setFormData({...formData, price: formatPrice(e.target.value)})} 
                    />
                  </div>
                </div>

                <div className="p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Görsel ve Video Yönetimi</p>
                  <div className="flex justify-center flex-wrap gap-4 mb-6">
                    <button type="button" onClick={() => addMediaByLink('image')} className="p-4 bg-white rounded-2xl shadow-sm hover:text-indigo-600 transition-all flex flex-col items-center gap-2 w-24">
                      <LinkIcon size={24} /><span className="text-[9px] font-black uppercase">RESİM LİNK</span>
                    </button>
                    <label className="p-4 bg-white rounded-2xl shadow-sm hover:text-indigo-600 cursor-pointer flex flex-col items-center gap-2 w-24">
                      <Upload size={24} /><span className="text-[9px] font-black uppercase">DOSYA YÜKLE</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'image')} />
                    </label>
                    <button type="button" onClick={() => addMediaByLink('video')} className="p-4 bg-white rounded-2xl shadow-sm hover:text-indigo-600 transition-all flex flex-col items-center gap-2 w-24">
                      <Video size={24} /><span className="text-[9px] font-black uppercase">VİDEO LİNK</span>
                    </button>
                    <label className="p-4 bg-white rounded-2xl shadow-sm hover:text-indigo-600 cursor-pointer flex flex-col items-center gap-2 w-24">
                      <Video size={24} /><span className="text-[9px] font-black uppercase">VİDEO YÜKLE</span>
                      <input type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e, 'video')} />
                    </label>
                  </div>
                  
                  {formData.media.length > 0 && (
                    <div className="flex flex-wrap gap-3 justify-center">
                      {formData.media.map((m, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden group shadow-md border-2 border-white">
                          {m.type === 'video' ? <div className="w-full h-full bg-black flex items-center justify-center text-white text-[10px] font-bold">VİDEO</div> : <img src={m.url} className="w-full h-full object-cover" />}
                          <button type="button" onClick={() => setFormData({...formData, media: formData.media.filter((_, idx) => idx !== i)})} className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><Trash2 size={20} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {isUploading && <div className="mt-4 text-[10px] font-black text-indigo-600 flex items-center justify-center gap-2 animate-pulse"><Loader2 className="animate-spin" size={14} /> MEDYALAR İŞLENİYOR...</div>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ürün Detayları</label>
                  <textarea placeholder="Özellikler, ölçüler vb..." rows="4" className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>

                <button type="submit" disabled={isUploading || isSubmitting} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : editingProduct ? 'GÜNCELLE' : 'KATALOĞA EKLE'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Login Modalı */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
              <Lock size={32} />
            </div>
            <h2 className="text-3xl font-black mb-2 text-center">Admin Girişi</h2>
            <p className="text-slate-400 text-center mb-8 text-sm">Düzenleme yapmak için şifre giriniz.</p>
            <form onSubmit={e => { e.preventDefault(); if(passwordInput === ADMIN_PASSWORD) { setIsAdminLoggedIn(true); setShowLoginModal(false); setPasswordInput(''); } else alert('Hatalı Şifre!'); }} className="space-y-4">
              <input type="password" placeholder="••••" autoFocus className="w-full p-5 bg-slate-100 rounded-2xl outline-none text-center text-3xl tracking-[0.5em] focus:ring-2 focus:ring-indigo-500" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black hover:bg-black transition-all">PANELİ AÇ</button>
              <button type="button" onClick={() => setShowLoginModal(false)} className="w-full text-slate-400 text-sm font-bold pt-2 uppercase tracking-widest">Kapat</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
