'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { useItems } from '@/lib/data';
import { useToast } from '@/lib/ui';
import { money } from '@/lib/helpers';
import { adjustStock, createItem, deleteItem, updateItem } from '@/lib/actions';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 20;
const EMPTY = { name: '', vehicleType: '', barcode: '', price: '', costPrice: '', stockQty: '', reorderLevel: '', notes: '' };

export default function InventoryPage() {
  const { items, allItems, ready } = useItems();
  const toast = useToast();
  const { isManager } = useAuth();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(null);          // null = closed; otherwise {id?, ...fields}
  const [stockFor, setStockFor] = useState(null);
  const [stock, setStock] = useState({ change: '', reason: '' });
  const [barcodeFor, setBarcodeFor] = useState(null);
  const svgRef = useRef(null);

  const filtered = useMemo(() => {
    const v = search.trim().toLowerCase();
    if (!v) return items;
    return items.filter((i) =>
      [i.name, i.barcode, i.vehicleType].some((x) => (x || '').toLowerCase().includes(v)));
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safeCurrentPage]);

  // Draw the barcode whenever the barcode modal opens
  // Height/width tuned for 80mm × 50mm sticker
  useEffect(() => {
    if (barcodeFor && svgRef.current) {
      JsBarcode(svgRef.current, barcodeFor.barcode, {
        format: 'CODE128',
        displayValue: true,
        height: 100,       // taller bars to fill 80×50mm sticker
        fontSize: 18,
        margin: 12,        // quiet-zone margin for scanner readability
        width: 2.5,        // bar width – scales well at 80mm
        textMargin: 4,
      });
    }
  }, [barcodeFor]);

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    if (!isManager) return;

    const name = form.name?.trim();
    const price = parseFloat(form.price);
    const stockQty = form.id ? null : parseInt(form.stockQty, 10);
    const reorderLevel = form.reorderLevel !== '' && form.reorderLevel !== null && form.reorderLevel !== undefined 
      ? parseInt(form.reorderLevel, 10) 
      : null;

    // 1. Mandatory Field Checks
    if (!name) {
      return toast('Item name is required', 'error');
    }
    if (form.price === '' || isNaN(price)) {
      return toast('Selling price is required', 'error');
    }
    if (!form.id && (form.stockQty === '' || isNaN(stockQty))) {
      return toast('Opening stock quantity is required', 'error');
    }

    // 2. Positive / Non-Negative Number Validations
    if (price <= 0) {
      return toast('Selling price must be greater than 0', 'error');
    }
    if (!form.id && stockQty < 0) {
      return toast('Opening stock quantity cannot be negative', 'error');
    }
    if (reorderLevel !== null && (isNaN(reorderLevel) || reorderLevel < 0)) {
      return toast('Reorder level cannot be negative', 'error');
    }

    try {
      if (form.id) { 
        await updateItem(form.id, form); 
        toast('Item updated', 'success'); 
      } else { 
        await createItem(allItems, form); 
        toast('Item added', 'success'); 
      }
      setForm(null);
    } catch (e) { 
      toast(e.message, 'error'); 
    }
  }

  async function remove(item) {
    if (!isManager) return;
    if (!confirm(`Remove "${item.name}" from inventory?`)) return;
    try { await deleteItem(item.id); toast('Item removed', 'success'); } catch (e) { toast(e.message, 'error'); }
  }

  async function submitStock() {
    if (!isManager) return;
    const change = parseInt(stock.change, 10);
    if (!change) return toast('Enter a quantity to add or remove', 'error');
    try {
      await adjustStock(stockFor, change, stock.reason);
      toast('Stock updated', 'success');
      setStockFor(null);
    } catch (e) { toast(e.message, 'error'); }
  }

    // Barcode Print Function — 68mm x 40mm Thermal Label
  function printBarcode() {
    if (!svgRef.current) return;

    const copiesStr = window.prompt('How many labels to print?', '1');
    if (copiesStr === null) return; // cancelled
    const copies = Math.max(1, Math.min(100, parseInt(copiesStr, 10) || 1));

    const svg = svgRef.current.outerHTML;
    const name = (barcodeFor?.name || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const price = barcodeFor?.price || 0;

    const labelHTML = `
      <div class="label-page">
        <div class="label-container">
          <div class="label-title">${name}</div>
          ${svg}
          <div class="label-price">Rs. ${price}</div>
        </div>
      </div>`;

    const allLabels = Array(copies).fill(labelHTML).join('');

    const w = window.open('', '_blank');
    if (!w) {
      alert('Please allow pop-ups for this website in your browser settings to print barcode labels.');
      return;
    }

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Label — ${name}</title>
          <style>
            /* FIX 1: "landscape" removed */
            @page {
              size: 68mm 40mm;
              margin: 0;
            }

            *, *::before, *::after {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              print-color-adjust: exact;
            }

            html, body {
              width: 68mm;
              background: #fff;
              font-family: Arial, Helvetica, sans-serif;
            }

            .label-page {
              position: relative;
              width: 68mm;
              height: 39mm;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
              overflow: hidden;
            }

            /* FIX 2: last-child -> last-of-type */
            .label-page:last-of-type {
              page-break-after: auto;
              break-after: auto;
            }

            .label-container {
              width: 68mm;
              height: 39mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 2mm 3mm;
              overflow: hidden;
            }

            .label-container, .label-container * {
              color: #000000 !important;
              font-weight: bold !important;
            }

            .label-title {
              font-size: 12px;
              text-align: center;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 62mm;
              line-height: 1.2;
              margin-bottom: 2mm;
            }

            svg {
              display: block;
              width: 90% !important;
              max-width: 62mm !important;
              height: auto !important;
              max-height: 17mm !important;
              margin: 0 auto;
            }

            .label-price {
              font-size: 13px;
              margin-top: 1.5mm;
              text-align: center;
            }

            /* On-screen preview (no printer needed) */
            @media screen {
              html, body {
                width: auto;
                background: #6b6b6b;
              }
              .toolbar {
                position: sticky;
                top: 0;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 10px 14px;
                background: #222;
                color: #fff;
                font: 14px Arial, Helvetica, sans-serif;
              }
              .toolbar button {
                padding: 8px 18px;
                border: 0;
                border-radius: 6px;
                background: #8ab4f8;
                color: #000;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
              }
              .label-page {
                margin: 16px auto;
                background: #fff;
                box-shadow: 0 0 0 1px #000, 0 4px 14px rgba(0,0,0,.45);
              }
            }

            @media print {
              @page {
                size: 68mm 40mm;
                margin: 0;
              }
              .toolbar {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <span>Label size: 68 × 40 mm — ${copies} label(s). Preview shows the real label shape.</span>
            <button type="button" onclick="window.print()">Print</button>
          </div>
          ${allLabels}
        </body>
      </html>
    `);
    w.document.close();
  }  
  
  return (
    <>
      <h1 className="page-title">Inventory</h1>
      <p className="page-sub">
        {isManager
          ? 'Manage your product categories, prices, stock levels and barcodes'
          : 'Search items, check stock and print barcode labels'}
      </p>

      <div className="toolbar">
        <input type="text" className="search-box" placeholder="Search by name, barcode or vehicle type..."
               value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
        {isManager && (
          <button className="btn btn-primary" onClick={() => setForm({ ...EMPTY })}>+ Add New Item</button>
        )}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Item</th><th>Barcode</th><th>Vehicle</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {paginatedItems.map((item) => {
              const low = item.stockQty <= item.reorderLevel;
              return (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong>{item.notes && <div className="cart-item-sub">{item.notes}</div>}</td>
                  <td><span className="barcode-tag">{item.barcode}</span></td>
                  <td>{item.vehicleType || '—'}</td>
                  <td>{money(item.price)}</td>
                  <td><span className={`badge ${low ? 'badge-red' : 'badge-green'}`}>{item.stockQty}</span></td>
                  <td>{low ? <span className="badge badge-amber">Low Stock</span> : <span className="badge badge-gray">OK</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {/* Everyone can print labels */}
                    <button className="btn btn-sm btn-secondary" onClick={() => setBarcodeFor(item)}>Barcode</button>{' '}
                    {/* Manager only */}
                    {isManager && (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setStockFor(item); setStock({ change: '', reason: '' }); }}>Stock</button>{' '}
                        <button className="btn btn-sm btn-secondary" onClick={() => setForm({
                          id: item.id, name: item.name, vehicleType: item.vehicleType || '', barcode: item.barcode,
                          price: item.price, costPrice: item.costPrice, stockQty: item.stockQty,
                          reorderLevel: item.reorderLevel, notes: item.notes || '',
                        })}>Edit</button>{' '}
                        <button className="btn btn-sm btn-danger" onClick={() => remove(item)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ready && filtered.length === 0 && (
          <div className="empty-state">
            {items.length === 0
              ? (isManager ? 'No items yet. Click "Add New Item" to get started.' : 'No items yet.')
              : 'No items match your search.'}
          </div>
        )}
        {ready && (
          <Pagination
            currentPage={safeCurrentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Add / Edit (manager only) */}
      <Modal open={isManager && !!form} onClose={() => setForm(null)}>
        {form && (
          <>
            <h2>{form.id ? 'Edit Item' : 'Add New Item'}</h2>
            
            <div className="field">
              <label>Item / Category Name <span style={{ color: 'red' }}>*</span></label>
              <input type="text" placeholder="e.g. Signal Light - Tuk Tuk" value={form.name} onChange={setF('name')} required />
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Vehicle Type</label>
                <input type="text" placeholder="e.g. Tuk Tuk, Bike, Bus" value={form.vehicleType} onChange={setF('vehicleType')} />
              </div>
              <div className="field">
                <label>Barcode {!form.id && <span style={{ fontWeight: 400 }}>(blank = auto)</span>}</label>
                <input type="text" placeholder="Auto" value={form.barcode} onChange={setF('barcode')} disabled={!!form.id} />
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Selling Price (Rs.) <span style={{ color: 'red' }}>*</span></label>
                <input type="number" step="1" min="0" placeholder="0.00" value={form.price} onChange={setF('price')} required />
              </div>
              <div className="field">
                <label>Cost Price (Rs.)</label>
                <input type="number" step="1" min="0" placeholder="0.00" value={form.costPrice} onChange={setF('costPrice')} />
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label>
                  {form.id ? 'Current Stock (use “Stock” to change)' : 'Opening Stock Qty'} {!form.id && <span style={{ color: 'red' }}>*</span>}
                </label>
                <input type="number" min="0" placeholder="0" value={form.stockQty} onChange={setF('stockQty')} disabled={!!form.id} required={!form.id} />
              </div>
              <div className="field">
                <label>Reorder Level</label>
                <input type="number" min="0" placeholder="5" value={form.reorderLevel} onChange={setF('reorderLevel')} />
              </div>
            </div>

            <div className="field">
              <label>Notes (optional)</label>
              <input type="text" placeholder="e.g. supplier, part number" value={form.notes} onChange={setF('notes')} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Item</button>
            </div>
          </>
        )}
      </Modal>

      {/* Stock adjust (manager only) */}
      <Modal open={isManager && !!stockFor} onClose={() => setStockFor(null)} width={360}>
        {stockFor && (
          <>
            <h2>Adjust Stock</h2>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: -10 }}>{stockFor.name} — current stock: {stockFor.stockQty}</p>
            <div className="field"><label>Add (+) or Remove (-) Quantity</label>
              <input type="number" placeholder="e.g. 10 or -2" value={stock.change} onChange={(e) => setStock({ ...stock, change: e.target.value })} /></div>
            <div className="field"><label>Reason</label>
              <input type="text" placeholder="e.g. New delivery, damaged item" value={stock.reason} onChange={(e) => setStock({ ...stock, reason: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setStockFor(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitStock}>Update Stock</button>
            </div>
          </>
        )}
      </Modal>

      {/* Barcode label (everyone) */}
      <Modal open={!!barcodeFor} onClose={() => setBarcodeFor(null)} width={340} align="center">
        {barcodeFor && (
          <>
            <h2>{barcodeFor.name}</h2>
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
              <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Print this label and stick it on the item / shelf</p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setBarcodeFor(null)}>Close</button>
              <button className="btn btn-primary" onClick={printBarcode}>Print</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}