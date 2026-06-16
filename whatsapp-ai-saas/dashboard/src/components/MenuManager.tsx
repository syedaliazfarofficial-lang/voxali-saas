import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Loader2, X, Utensils } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export function MenuManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', category_id: '', image_url: '' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: catData } = await supabase.from('menu_categories').select('*').order('priority');
    const { data: itemData } = await supabase.from('menu_items').select('*, menu_categories(name)');
    setCategories(catData || []);
    setItems(itemData || []);
    if (catData && catData.length > 0 && !formData.category_id) {
      setFormData(prev => ({ ...prev, category_id: catData[0].id }));
    }
    setLoading(false);
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    setAddingCat(true);
    // Insert without tenant_id for now (remove constraint or use temp)
    const { error } = await supabase.from('menu_categories').insert([{ name: newCategory.trim(), priority: categories.length }]);
    if (!error) { setNewCategory(''); fetchData(); }
    else alert('Error: ' + error.message);
    setAddingCat(false);
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return;
    await supabase.from('menu_categories').delete().eq('id', id);
    fetchData();
  }

  function openEdit(item: any) {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category_id: item.category_id || categories[0]?.id || '',
      image_url: item.image_url || '',
    });
    setShowModal(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Upload to Cloudinary (FREE — no Supabase storage used!)
      const formPayload = new FormData();
      formPayload.append('file', file);
      formPayload.append('upload_preset', 'menu_items_unsigned'); // Cloudinary unsigned preset
      formPayload.append('folder', 'menu-items');

      const res = await fetch('https://api.cloudinary.com/v1_1/dntw71eel/image/upload', {
        method: 'POST',
        body: formPayload,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      // Cloudinary auto-optimizes: use compressed URL
      const optimizedUrl = data.secure_url.replace('/upload/', '/upload/w_600,q_80,f_auto/');
      setFormData(prev => ({ ...prev, image_url: optimizedUrl }));
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.category_id) { alert('Please add a category first!'); return; }
    setSubmitting(true);

    const itemData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      category_id: formData.category_id,
      image_url: formData.image_url,
    };

    if (editingItem) {
      const { error } = await supabase.from('menu_items').update(itemData).eq('id', editingItem.id);
      if (error) alert('Error: ' + error.message);
    } else {
      const { error } = await supabase.from('menu_items').insert([itemData]);
      if (error) { alert('Error: ' + error.message); setSubmitting(false); return; }
    }

    setShowModal(false);
    setEditingItem(null);
    setFormData({ name: '', description: '', price: '', category_id: categories[0]?.id || '', image_url: '' });
    fetchData();
    setSubmitting(false);
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    fetchData();
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)', marginBottom: 12 }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading your menu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ─── CATEGORIES ─── */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">Categories</p>
            <p className="section-sub">Group your items into sections (e.g. Pizza, Burgers, Drinks)</p>
          </div>
        </div>

        <div className="flex gap-3" style={{ marginBottom: 16 }}>
          <input
            type="text"
            className="input"
            placeholder="e.g. Pizzas, Burgers, Cold Drinks..."
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
          />
          <button onClick={addCategory} disabled={addingCat} className="btn-primary">
            {addingCat ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {categories.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No categories yet. Add one above to get started.</p>
          )}
          {categories.map(cat => (
            <span key={cat.id} className="category-pill">
              {cat.name}
              <button onClick={() => deleteCategory(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)', padding: 0 }}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* ─── ITEMS ─── */}
      <div>
        <div className="section-header">
          <div>
            <p className="section-title">All Items ({items.length})</p>
            <p className="section-sub">Click "Add Item" to add food to your menu</p>
          </div>
          <button onClick={() => { setEditingItem(null); setFormData({ name: '', description: '', price: '', category_id: categories[0]?.id || '', image_url: '' }); setShowModal(true); }} className="btn-primary">
            <Plus size={16} />
            Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Utensils size={22} /></div>
            <h3 className="empty-title">No Menu Items Yet</h3>
            <p className="empty-desc">Add your first dish so the AI bot can share your menu with customers.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={16} />
              Add First Item
            </button>
          </div>
        ) : (
          <div className="grid-3">
            {items.map(item => (
              <div key={item.id} className={`item-card${item.image_url ? '' : ' item-card-no-image'}`}>
                {item.image_url && (
                  <div className="item-image-preview">
                    <img src={item.image_url} alt={item.name} />
                  </div>
                )}
                <div className="item-content">
                  <div className="item-top-row">
                    <p className="item-name">{item.name}</p>
                    <div className="item-actions">
                      <button onClick={() => openEdit(item)} className="btn-edit-ghost"><Edit3 size={15} /></button>
                      <button onClick={() => deleteItem(item.id)} className="btn-danger-ghost"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  {item.description && <p className="item-desc">{item.description}</p>}
                  <div className="item-footer">
                    <p className="item-price">Rs. {Number(item.price).toLocaleString()}</p>
                    {item.menu_categories && (
                      <span className="item-category-badge">{item.menu_categories.name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <p className="modal-title">{editingItem ? '✏️ Edit Item' : '➕ Add Menu Item'}</p>
              <button onClick={() => { setShowModal(false); setEditingItem(null); }} className="modal-close"><X size={20} /></button>
            </div>

            <form onSubmit={addItem}>
              <label>Dish Name *</label>
              <input type="text" required className="input" placeholder="e.g. Chicken Tikka Pizza"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />

              <label>Description</label>
              <textarea className="input" style={{ height: 76, resize: 'none' }}
                placeholder="Short description (optional)..."
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />

              <label>Dish Photo</label>
              <div className="image-upload-zone">
                {formData.image_url ? (
                  <div className="uploaded-preview">
                    <img src={formData.image_url} alt="Preview" />
                    <button type="button" className="btn-remove-img" onClick={() => setFormData({ ...formData, image_url: '' })}><X size={14} /></button>
                  </div>
                ) : (
                  <label className="upload-placeholder">
                    {uploading ? <Loader2 size={24} className="animate-spin" /> : <><Plus size={24} /> <span>Upload Photo</span></>}
                    <input type="file" accept="image/*" onChange={handleImageUpload} hidden disabled={uploading} />
                  </label>
                )}
              </div>

              <div className="grid-2">
                <div>
                  <label>Price (Rs.) *</label>
                  <input type="number" required className="input" placeholder="450"
                    value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                </div>
                <div>
                  <label>Category *</label>
                  {categories.length === 0 ? (
                    <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>⚠️ Add a category first!</p>
                  ) : (
                    <select required className="input"
                      value={formData.category_id}
                      onChange={e => setFormData({ ...formData, category_id: e.target.value })}>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <button type="submit" disabled={submitting || categories.length === 0}
                className="btn-primary btn-full mt-20">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingItem ? '✏️ Update Item' : '💾 Save Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
