import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportMapAsPDF(elementId, filename = 'performance-map') {
  const el = document.getElementById(elementId)
  if (!el) return

  const canvas = await html2canvas(el, {
    backgroundColor: '#0a0a14',
    scale: 2,
    useCORS: true,
    scrollX: 0,
    scrollY: 0,
    width: el.scrollWidth,
    height: el.scrollHeight,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width / 2, canvas.height / 2],
  })
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
  pdf.save(`${filename}.pdf`)
}

export async function exportMapAsImage(elementId, filename = 'performance-map') {
  const el = document.getElementById(elementId)
  if (!el) return

  const canvas = await html2canvas(el, {
    backgroundColor: '#0a0a14',
    scale: 2,
    useCORS: true,
    scrollX: 0,
    scrollY: 0,
    width: el.scrollWidth,
    height: el.scrollHeight,
  })

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
