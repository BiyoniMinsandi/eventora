'use client'

/**
 * Route: /admin/content
 * Purpose: Admin content management screen (stored locally for demo mode).
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit2, Trash2, Eye, EyeOff, Plus, Search, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { getAdminCategories, getAdminFaqs, getAdminPages } from '@/lib/data'

// No hard-coded demo content — load from localStorage when available

function Loading() {
  return null;
}

export default function AdminContent() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('pages')
  const [searchQuery, setSearchQuery] = useState('')
  const [pages, setPages] = useState<any[]>([])
  const [faqs, setFaqs] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [p, f, c] = await Promise.all([getAdminPages(), getAdminFaqs(), getAdminCategories()])
      if (cancelled) return
      setPages(p)
      setFaqs(f)
      setCategories(c)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ProtectedRoute allowedRoles={['admin']}>
    <div className="flex h-screen bg-background">
      <Sidebar userRole="admin" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Content Management</h1>
                <p className="text-muted-foreground">Manage pages, FAQs, and platform categories</p>
              </div>
            </div>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create New
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pages">Pages</TabsTrigger>
                <TabsTrigger value="faqs">FAQs</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
              </TabsList>

              {/* Pages Tab */}
              <TabsContent value="pages" className="space-y-6">
                <Card className="p-0 overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search pages..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 bg-muted border-border"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Slug</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Views</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Last Updated</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pages.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">No pages yet. Create a new page using "Create New".</td>
                          </tr>
                        ) : (
                          pages.map(page => (
                            <tr key={page.id} className="border-b border-border hover:bg-muted/30">
                              <td className="px-6 py-4 font-medium text-foreground">{page.title}</td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">/{page.slug}</td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    page.status === 'published'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}
                                >
                                  {page.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{(page.views || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{page.lastUpdated || '-'}</td>
                              <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                <Button size="sm" variant="ghost">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* FAQs Tab */}
              <TabsContent value="faqs" className="space-y-6">
                <Card className="p-0 overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search FAQs..."
                        className="pl-10 bg-muted border-border"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Question</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Views</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faqs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">No FAQs found. Add FAQs using "Create New".</td>
                          </tr>
                        ) : (
                          faqs.map(faq => (
                            <tr key={faq.id} className="border-b border-border hover:bg-muted/30">
                              <td className="px-6 py-4 font-medium text-foreground max-w-xs truncate">
                                {faq.question}
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{faq.category}</td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    faq.status === 'published'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}
                                >
                                  {faq.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{(faq.views || 0).toLocaleString()}</td>
                              <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                <Button size="sm" variant="ghost">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="categories" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.length === 0 ? (
                    <Card className="p-6">
                      <p className="text-sm text-muted-foreground">No categories available. Add a category using "Create New".</p>
                    </Card>
                  ) : (
                    categories.map(category => (
                      <Card key={category.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-foreground text-lg">{category.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {(category.vendors || 0)} vendors
                            </p>
                          </div>
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              category.active
                                ? 'bg-green-100'
                                : 'bg-red-100'
                            }`}
                          >
                            {category.active ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button variant="outline" className="w-full gap-2 bg-transparent">
                            <Edit2 className="w-4 h-4" />
                            Edit Category
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full gap-2 bg-transparent"
                          >
                            {category.active ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}

                  {/* Add New Category */}
                  <Card className="p-6 border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center cursor-pointer">
                    <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="font-medium text-foreground text-center">Add New Category</p>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </ProtectedRoute>
    )
}
