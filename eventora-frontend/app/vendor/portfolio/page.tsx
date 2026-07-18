'use client'

/**
 * Route: /vendor/portfolio
 * Vendors upload images/videos directly to Cloudinary via the backend upload
 * endpoints (/api/upload/image, /api/upload/video). The returned URL is then
 * saved to the user's profile via PUT /api/users/me.
 */

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Upload, ImageIcon, Video, X, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { updateMeApi } from '@/lib/auth'
import { uploadFile } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function VendorPortfolio() {
  const { user, logout, login } = useAuth()
  const router = useRouter()

  const [photos, setPhotos] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [services, setServices] = useState<{ id: string; title: string; desc: string }[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newService, setNewService] = useState({ title: '', desc: '' })

  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleLogout = () => { logout(); router.push('/login') }

  useEffect(() => {
    if (user?.photos) setPhotos(user.photos)
    if (user?.videos) setVideos(user.videos)
    if (user?.services) {
      setServices(user.services.map((s, i) => ({
        id: `svc_${i}`,
        title: s.split(':')[0] || s,
        desc: s.split(':')[1] || '',
      })))
    }
  }, [user])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploadingPhoto(true)
    try {
      const { url } = await uploadFile('/api/upload/image', file)
      const updated = [...photos, url]
      const result = await updateMeApi({ photos: updated })
      if (result.success && result.user) { login(result.user); setPhotos(updated) }
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploadingVideo(true)
    try {
      const { url } = await uploadFile('/api/upload/video', file)
      const updated = [...videos, url]
      const result = await updateMeApi({ videos: updated })
      if (result.success && result.user) { login(result.user); setVideos(updated) }
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload video')
    } finally {
      setUploadingVideo(false)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async (idx: number) => {
    const updated = photos.filter((_, i) => i !== idx)
    const result = await updateMeApi({ photos: updated })
    if (result.success && result.user) { login(result.user); setPhotos(updated) }
  }

  const handleRemoveVideo = async (idx: number) => {
    const updated = videos.filter((_, i) => i !== idx)
    const result = await updateMeApi({ videos: updated })
    if (result.success && result.user) { login(result.user); setVideos(updated) }
  }

  const handleAddService = async () => {
    if (!newService.title) return
    const raw = newService.desc ? `${newService.title}:${newService.desc}` : newService.title
    const updatedRaw = [...(user?.services || []), raw]
    const result = await updateMeApi({ services: updatedRaw })
    if (result.success && result.user) {
      login(result.user)
      setServices(prev => [...prev, { id: `svc_${Date.now()}`, title: newService.title, desc: newService.desc }])
      setNewService({ title: '', desc: '' })
      setShowAddDialog(false)
    }
  }

  const handleDeleteService = async (svcId: string) => {
    const idx = services.findIndex(s => s.id === svcId)
    if (idx === -1) return
    const updatedRaw = (user?.services || []).filter((_, i) => i !== idx)
    const result = await updateMeApi({ services: updatedRaw })
    if (result.success && result.user) { login(result.user); setServices(services.filter(s => s.id !== svcId)) }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="vendor" userName={user?.businessName || user?.fullName || 'Vendor'} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
              <p className="text-muted-foreground text-sm mt-1">Upload photos and videos that appear on your public profile</p>
            </div>
          </div>

          {uploadError && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {uploadError}
            </div>
          )}

          {/* Photo Gallery */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Photos</h2>
                <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG or WebP · max 10 MB each</p>
              </div>
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="gap-2"
                >
                  {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingPhoto ? 'Uploading…' : 'Upload Photo'}
                </Button>
              </div>
            </div>

            {photos.length === 0 ? (
              <div
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Click to upload your first photo</p>
                <p className="text-xs text-muted-foreground mt-1">They will appear in your gallery on the vendor profile page</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden bg-muted aspect-square">
                    <Image src={url} alt={`Photo ${idx + 1}`} fill className="object-cover" unoptimized />
                    <button
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1.5 right-1.5 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Add more</span>
                </div>
              </div>
            )}
          </Card>

          {/* Video Gallery */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><Video className="w-5 h-5 text-primary" /> Videos</h2>
                <p className="text-xs text-muted-foreground mt-0.5">MP4, MOV or WebM · max 200 MB each</p>
              </div>
              <div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept=".mp4,.mov,.webm,.avi"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
                <Button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="gap-2"
                >
                  {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingVideo ? 'Uploading…' : 'Upload Video'}
                </Button>
              </div>
            </div>

            {videos.length === 0 ? (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Click to upload your first video</p>
                <p className="text-xs text-muted-foreground mt-1">Videos will be stored in Cloudinary and shown in your gallery</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {videos.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden bg-black border border-border" style={{aspectRatio:'16/9'}}>
                    <video src={url} controls preload="metadata" className="w-full h-full object-contain" />
                    <button
                      onClick={() => handleRemoveVideo(idx)}
                      className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  style={{aspectRatio:'16/9'}}
                >
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Add video</span>
                </div>
              </div>
            )}
          </Card>

          {/* Services */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Services</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Listed on your profile under the Services tab</p>
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Plus className="w-4 h-4" /> Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Add Service</DialogTitle>
                  <DialogDescription>Add a service or package that you offer</DialogDescription>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Service Name</label>
                      <Input placeholder="e.g. Wedding Photography" value={newService.title} onChange={e => setNewService({ ...newService, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Description / Price</label>
                      <Textarea placeholder="e.g. Rs. 75,000 — 8 hours, 500 edited photos" value={newService.desc} onChange={e => setNewService({ ...newService, desc: e.target.value })} rows={3} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                      <Button onClick={handleAddService} disabled={!newService.title}>Add Service</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No services yet. Add your first one above.</p>
            ) : (
              <div className="space-y-3">
                {services.map(svc => (
                  <div key={svc.id} className="flex items-start justify-between p-4 rounded-xl border border-border hover:border-primary/20 transition-colors">
                    <div>
                      <p className="font-semibold text-foreground">{svc.title}</p>
                      {svc.desc && <p className="text-sm text-muted-foreground mt-0.5">{svc.desc}</p>}
                    </div>
                    <button onClick={() => handleDeleteService(svc.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-4 mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
