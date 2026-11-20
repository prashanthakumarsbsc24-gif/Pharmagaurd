import { downloadCSV } from './csv';

export function exportInventory(items, currency, filename = 'pharmaguard-stock.csv') {
  downloadCSV(
    filename,
    ['Medication', 'Batch', 'Storage', 'Price', 'Currency', 'Quantity', 'Units sold', 'Expiration date', 'Status'],
    items.map((i) => [i.medicationName, i.batchNumber, i.storage, i.price, currency, i.quantity, i.unitsSold, i.expirationDate, i.status])
  );
}
