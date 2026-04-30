import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileSize',
  standalone: true
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number | null | undefined): string {
    if (bytes == null || isNaN(bytes) || bytes <= 0) {
      return '—';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }
    const decimals = i === 0 ? 0 : value < 10 ? 1 : 0;
    return `${value.toFixed(decimals)} ${units[i]}`;
  }
}
