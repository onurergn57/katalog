import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  updateDoc 
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
  X,
  Search,
  Lock,
  Unlock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Edit
} from 'lucide-react';

// --- FİREBASE YAPILANDIRMASI ---
// API Key boş bırakılmalıdır, ortam tarafından otomatik sağlanır.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "", 
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

// --- YARDIMCI BİLEŞENLER ---
const MediaSlider = ({ items = [], onCardClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!items || items.length === 0) return (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400" onClick={onCardClick}>
      <ImageIcon size={32} strokeWidth={1} />
    </div>
  );

  return (
    <div className="relative w-full h-full group bg-black" onClick={onCardClick}>
      <img 
        src={items[currentIndex]?.url} 
        className="w-full h-full object-cover transition-opacity duration-300" 
        alt="Ürün"
      />
      {items.length > 1 && (
        <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + items.length) % items.length); }} className="bg-white/80 p-1 rounded-full text-slate-800"><ChevronLeft size={16}/></button>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % items.length); }} className="bg-white/80 p-1 rounded-full text-slate-800"><ChevronRight size={16}/></button>
        </div>
      )}
    </div>
  );
};

// --- ANA UYGULAMA ---
const App = () => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState({ type: 'list', data: null });
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pass, setPass] = useState('');
  
  // Form Durumu
  const [formData, setFormData] = useState({ title: '', code: '', price: '', desc: '', media: [] });

  // Kimlik Doğrulama Başlatma
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubAuth = onAuthStateChanged(auth, setUser);
    return () => unsubAuth();
  }, []);

  // Veri Dinleme
  useEffect(() => {
    if (!user) return;
    
    // KURAL: Her zaman /artifacts/{appId}/public/data/{collection} yolunu kullanın
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    
    const unsub = onSnapshot(productsRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // KURAL: Karmaşık sorgular yerine JS belleğinde sıralama yapın
      setProducts(data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });
    
    return () => unsub();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    const docData = { 
      ...formData, 
      updatedAt: new Date().toISOString() 
    };

    try {
      if (formData.id) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', formData.id);
        await updateDoc(docRef, docData);
      } else {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
        await addDoc(colRef, { 
          ...docData, 
          createdAt: new Date().toISOString() 
        });
      }
      setIsModalOpen(false);
      setFormData({ title: '', code: '', price: '', desc: '', media: [] });
    } catch (error) {
      console.error("Save error:", error);
      alert("Kaydedilirken bir hata oluştu.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  const filtered = products.filter(p => 
    (p.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
    (p.code?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Başlık */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight cursor-pointer" onClick={() => setView({type:'list'})}>
          <div className="bg-blue-600 text-white p-2 rounded-lg"><Package size={20}/></div>
          PREMIUM KATALOG
        </div>
        <button 
          onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isAdmin ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}
        >
          {isAdmin ? <Lock size={14}/> : <Unlock size={14}/>}
          {isAdmin ? 'Çıkış' : 'Panel'}
        </button>
      </header>

      {view.type === 'list' ? (
        <main className="max-w-7xl mx-auto p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:ring-2 ring-blue-100 transition-all"
                placeholder="Ürün veya kod ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {isAdmin && (
              <button 
                onClick={() => { setFormData({title:'', code:'', price:'', desc:'', media:[]}); setIsModalOpen(true); }}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100"
              >
                <Plus size={20}/> YENİ EKLE
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all group">
                <div className="aspect-square">
                  <MediaSlider items={p.media} onCardClick={() => setView({type:'detail', data:p})} />
                </div>
                <div className="p-4">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">{p.code || 'KODSUZ'}</div>
                  <h3 className="font-bold text-slate-800 line-clamp-1 mb-2">{p.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className="font-black text-lg">{p.price} ₺</span>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setFormData(p); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                        <button onClick={async () => {
                          if (confirm('Silinsin mi?')) {
                            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', p.id));
                          }
                        }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && !loading && (
            <div className="text-center py-20 text-slate-400">Ürün bulunamadı.</div>
          )}
        </main>
      ) : (
        <main className="max-w-4xl mx-auto p-6 animate-in fade-in duration-500">
          <button onClick={() => setView({type:'list'})} className="flex items-center gap-2 text-slate-400 font-bold text-xs mb-8 hover:text-blue-600 transition-colors">
            <ArrowLeft size={16}/> LİSTEYE DÖN
          </button>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-4">
              {view.data.media?.map((m, i) => (
                <img key={i} src={m.url} className="w-full rounded-3xl shadow-lg border border-slate-100" alt={view.data.title} />
              ))}
              {(!view.data.media || view.data.media.length === 0) && (
                <div className="aspect-square bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300">
                  <ImageIcon size={64} strokeWidth={1} />
                </div>
              )}
            </div>
            <div className="space-y-6">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                {view.data.code || 'KODSUZ'}
              </span>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">{view.data.title}</h1>
              <div className="text-3xl font-black text-blue-600">{view.data.price} ₺</div>
              <p className="text-slate-500 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-2xl border border-slate-100">
                {view.data.desc || 'Bu ürün için açıklama bulunmuyor.'}
              </p>
            </div>
          </div>
        </main>
      )}

      {/* Giriş Modalı */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-xs text-center shadow-2xl scale-in-center">
            <h2 className="font-black mb-6 text-slate-800">YÖNETİCİ GİRİŞİ</h2>
            <input 
              type="password" 
              autoFocus 
              className="w-full p-4 bg-slate-50 rounded-2xl border outline-none focus:ring-2 ring-blue-100 text-center mb-4 font-bold" 
              placeholder="Şifre" 
              value={pass} 
              onChange={e=>setPass(e.target.value)} 
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowLogin(false); setPass(''); }} className="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600">İptal</button>
              <button 
                onClick={() => { 
                  if(pass === ADMIN_PASSWORD) { 
                    setIsAdmin(true); 
                    setShowLogin(false); 
                    setPass(''); 
                  } else {
                    alert('Hatalı şifre!');
                  }
                }} 
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Giriş
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ekle/Düzenle Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xl text-slate-800">{formData.id ? 'ÜRÜNÜ DÜZENLE' : 'YENİ ÜRÜN EKLE'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">Ürün Adı *</label>
                <input required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ring-blue-100" placeholder="Örn: Premium Mavi Gömlek" value={formData.title} onChange={e=>setFormData({...formData, title:e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">Ürün Kodu</label>
                  <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ring-blue-100 uppercase" placeholder="KOD-001" value={formData.code} onChange={e=>setFormData({...formData, code:e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">Fiyat (TL) *</label>
                  <input required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 ring-blue-100 font-bold text-blue-600" placeholder="1.250" value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})} />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">Ürün Fotoğrafları</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50">
                  <input type="file" multiple accept="image/*" onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    const newMedia = [];
                    for(let f of files) {
                      const reader = new FileReader();
                      const promise = new Promise(res => {
                        reader.onload = (re) => res(re.target?.result);
                        reader.readAsDataURL(f);
                      });
                      const result = await promise;
                      if (result) newMedia.push({ url: result, type: 'image' });
                    }
                    setFormData(prev => ({...prev, media: [...prev.media, ...newMedia]}));
                  }} className="hidden" id="fup" />
                  <label htmlFor="fup" className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 font-bold text-xs hover:text-blue-600 transition-colors">
                    <ImageIcon size={32} strokeWidth={1.5}/>
                    <span>FOTOĞRAF SEÇ VEYA SÜRÜKLE</span>
                  </label>
                  
                  {formData.media.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-6 justify-center">
                      {formData.media.map((m,i) => (
                        <div key={i} className="relative w-16 h-16 group">
                          <img src={m.url} className="w-full h-full object-cover rounded-xl border border-slate-200" alt="" />
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, media: formData.media.filter((_,idx)=>idx!==i)})} 
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          >
                            <X size={12}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-widest">Açıklama</label>
                <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-24 outline-none focus:ring-2 ring-blue-100" placeholder="Ürün detaylarını buraya yazın..." value={formData.desc} onChange={e=>setFormData({...formData, desc:e.target.value})} />
              </div>
              
              <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-[0.98]">
                {formData.id ? 'DEĞİŞİKLİKLERİ KAYDET' : 'ÜRÜNÜ YAYINLA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
