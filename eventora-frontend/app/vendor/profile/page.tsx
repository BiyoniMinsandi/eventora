'use client'

/**
 * Route: /vendor/profile
 * Purpose: Edit vendor profile details and manage portfolio (photos, videos, services).
 * Merged from profile + portfolio into one page.
 */

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth-provider'
import { updateMeApi } from '@/lib/auth'
import { uploadFile } from '@/lib/api'
import {
  Upload, X, Save, ArrowLeft, ImageIcon, Video,
  ExternalLink, Plus, Trash2, Loader2, Star,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

const SL_CITIES = [
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha',
  'Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala',
  'Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya',
  'Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya',
]

export default function VendorProfilePage() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  // Profile fields
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    category: '',
    location: '',
    phone: '',
    pricing: '',
    experience: '',
  })

  // Media
  const [photos, setPhotos] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [services, setServices] = useState<{ id: string; title: string; desc: string }[]>([])

  // UI state
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false)
  const [newService, setNewService] = useState({ title: '', desc: '' })

  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setFormData({
        businessName: user.businessName || '',
        description: user.description || '',
        category: user.category || '',
        location: user.location || '',
        phone: user.phone || '',
        pricing: user.pricing || '',
        experience: user.experience || '',
      })
      setPhotos(user.photos || [])
      setVideos(user.videos || [])
      if (user.services) {
        setServices(user.services.map((s, i) => ({
          id: `svc_${i}`,
          title: s.split(':')[0] || s,
          desc: s.split(':').slice(1).join(':') || '',
        })))
      }
    }
  }, [user])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhoto(true)
    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      try {
        const { url } = await uploadFile('/api/upload/image', file)
        newUrls.push(url)
      } catch (err: any) {
        toast({ title: 'Upload failed', description: err?.message || 'Failed to upload image', variant: 'destructive' })
      }
    }
    if (newUrls.length > 0) {
      const updated = [...photos, ...newUrls]
      setPhotos(updated)
      const result = await updateMeApi({ photos: updated })
      if (result.success && result.user) refreshUser(result.user)
      else if (!result.success) toast({ title: 'Save failed', description: result.message, variant: 'destructive' })
    }
    setUploadingPhoto(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVideo(true)
    try {
      const { url } = await uploadFile('/api/upload/video', file)
      const updated = [...videos, url]
      setVideos(updated)
      const result = await updateMeApi({ videos: updated })
      if (result.success && result.user) refreshUser(result.user)
      else toast({ title: 'Save failed', description: result.message, variant: 'destructive' })
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Failed to upload video', variant: 'destructive' })
    }
    setUploadingVideo(false)
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const handleSetCover = async (idx: number) => {
    if (idx === 0) return
    const updated = [photos[idx], ...photos.filter((_, i) => i !== idx)]
    setPhotos(updated)
    const result = await updateMeApi({ photos: updated })
    if (result.success && result.user) refreshUser(result.user)
    toast({ title: 'Cover photo updated' })
  }

  const handleRemovePhoto = async (idx: number) => {
    const updated = photos.filter((_, i) => i !== idx)
    setPhotos(updated)
    const result = await updateMeApi({ photos: updated })
    if (result.success && result.user) refreshUser(result.user)
  }

  const handleRemoveVideo = async (idx: number) => {
    const updated = videos.filter((_, i) => i !== idx)
    setVideos(updated)
    const result = await updateMeApi({ videos: updated })
    if (result.success && result.user) refreshUser(result.user)
  }

  const handleAddService = async () => {
    if (!newService.title.trim()) return
    const raw = newService.desc ? `${newService.title}:${newService.desc}` : newService.title
    const updatedRaw = [...(user?.services || []), raw]
    const result = await updateMeApi({ services: updatedRaw })
    if (result.success && result.user) {
      refreshUser(result.user)
      setServices(prev => [...prev, { id: `svc_${Date.now()}`, title: newService.title, desc: newService.desc }])
      setNewService({ title: '', desc: '' })
      setShowAddServiceDialog(false)
      toast({ title: 'Service added' })
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' })
    }
  }

  const handleDeleteService = async (svcId: string) => {
    const idx = services.findIndex(s => s.id === svcId)
    if (idx === -1) return
    const updatedRaw = (user?.services || []).filter((_, i) => i !== idx)
    const result = await updateMeApi({ services: updatedRaw })
    if (result.success && result.user) {
      refreshUser(result.user)
      setServices(prev => prev.filter(s => s.id !== svcId))
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const result = await updateMeApi(formData)
    setSaving(false)
    if (result.success) {
      if (result.user) refreshUser(result.user)
      toast({ title: 'Profile saved successfully' })
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' })
    }
  }

  if (!user) return null

  return (
    <ProtectedRoute allowedRoles={['vendor']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="vendor" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold">My Profile &amp; Portfolio</h1>
                <p className="text-muted-foreground">Update your business details, photos, and services</p>
              </div>
            </div>
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/vendors/${user.id}`} target="_blank">
                <ExternalLink className="w-4 h-4" />
                Preview Profile
              </Link>
            </Button>
          </div>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Update your business details visible to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(p => ({ ...p, businessName: e.target.value }))}
                    placeholder="Your business name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground"
                  >
                    <option value="">Select a category</option>
                    <option value="photography">Photography</option>
                    <option value="catering">Catering</option>
                    <option value="decoration">Decoration</option>
                    <option value="venues">Venues</option>
                    <option value="music">Music &amp; Entertainment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">City</Label>
                  <select
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground"
                  >
                    <option value="">Select a city</option>
                    {SL_CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+94 71 234 5678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe your business and what makes you unique..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricing">Pricing Range</Label>
                  <Input
                    id="pricing"
                    value={formData.pricing}
                    onChange={(e) => setFormData(p => ({ ...p, pricing: e.target.value }))}
                    placeholder="e.g., Rs. 50,000 – Rs. 200,000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => setFormData(p => ({ ...p, experience: e.target.value }))}
                    placeholder="e.g., 5+ years"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Photos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Photos &amp; Cover Image
                  </CardTitle>
                  <CardDescription>
                    The first photo is your <strong>cover image</strong> — shown as the hero banner customers see. Hover a photo and click "Set as Cover" to change it.
                  </CardDescription>
                </div>
                <div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="gap-2"
                  >
                    {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Click to upload your first photo</p>
                  <p className="text-xs text-muted-foreground mt-1">Your first photo becomes the cover image customers see on your profile</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden bg-muted aspect-square">
                      <Image src={url} alt={`Photo ${idx + 1}`} fill className="object-cover" unoptimized />
                      {/* Cover badge on first photo */}
                      {idx === 0 && (
                        <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-current" /> Cover
                        </div>
                      )}
                      {/* Set as Cover button on non-cover photos */}
                      {idx !== 0 && (
                        <button
                          onClick={() => handleSetCover(idx)}
                          className="absolute bottom-1.5 left-1.5 right-8 bg-black/75 text-white text-[10px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-center"
                        >
                          Set as Cover
                        </button>
                      )}
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
            </CardContent>
          </Card>

          {/* Portfolio Videos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Portfolio Videos
                  </CardTitle>
                  <CardDescription>MP4, MOV or WebM &middot; max 200 MB each &middot; saved automatically</CardDescription>
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
                    {uploadingVideo ? 'Uploading...' : 'Upload Video'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {videos.length === 0 ? (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Click to upload your first video</p>
                  <p className="text-xs text-muted-foreground mt-1">Videos are stored in Cloudinary and shown in your gallery</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {videos.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden bg-black border border-border" style={{ aspectRatio: '16/9' }}>
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
                    style={{ aspectRatio: '16/9' }}
                  >
                    <Plus className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Add video</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Services &amp; Packages</CardTitle>
                  <CardDescription>Listed on your public profile under the Services section</CardDescription>
                </div>
                <Dialog open={showAddServiceDialog} onOpenChange={setShowAddServiceDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-transparent">
                      <Plus className="w-4 h-4" /> Add Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogTitle>Add Service</DialogTitle>
                    <DialogDescription>Add a service or package that you offer</DialogDescription>
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Service Name</label>
                        <Input
                          placeholder="e.g. Wedding Photography"
                          value={newService.title}
                          onChange={e => setNewService(p => ({ ...p, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Description / Price (optional)</label>
                        <Textarea
                          placeholder="e.g. Rs. 75,000 — 8 hours, 500 edited photos"
                          value={newService.desc}
                          onChange={e => setNewService(p => ({ ...p, desc: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowAddServiceDialog(false)}>Cancel</Button>
                        <Button onClick={handleAddService} disabled={!newService.title.trim()}>Add Service</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
