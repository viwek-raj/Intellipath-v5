'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Check, X, FolderOpen, Tag, Layers } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Category { _id: string; name: string; slug: string; description: string; subCategoryCount: number; tagCount: number; isActive: boolean; }
interface SubCategory { _id: string; name: string; slug: string; category: string; isActive: boolean; }
interface TagItem { _id: string; name: string; slug: string; subCategory: string; isActive: boolean; }

export default function TaxonomyPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [tags, setTags] = useState<TagItem[]>([]);
    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);
    const [newCatName, setNewCatName] = useState('');
    const [newSubCatName, setNewSubCatName] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, type: 'category' | 'subcategory' | 'tag' | null, id: string | null}>({isOpen: false, type: null, id: null});

    useEffect(() => { fetchCategories(); }, []);
    useEffect(() => { if (selectedCat) fetchSubCategories(); else setSubCategories([]); }, [selectedCat]);
    useEffect(() => { if (selectedSubCat) fetchTags(); else setTags([]); }, [selectedSubCat]);

    const fetchCategories = async () => {
        try {
            const { data } = await adminApi.getCategories();
            setCategories(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchSubCategories = async () => {
        try {
            const { data } = await adminApi.getSubCategories(selectedCat!);
            setSubCategories(data);
        } catch (err) { console.error(err); }
    };

    const fetchTags = async () => {
        try {
            const { data } = await adminApi.getTags(selectedSubCat!);
            setTags(data);
        } catch (err) { console.error(err); }
    };

    const addCategory = async () => {
        if (!newCatName.trim()) return;
        try {
            await adminApi.createCategory({ name: newCatName.trim() });
            setNewCatName('');
            fetchCategories();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create category');
        }
    };

    const addSubCategory = async () => {
        if (!newSubCatName.trim() || !selectedCat) return;
        try {
            await adminApi.createSubCategory({ name: newSubCatName.trim(), categoryId: selectedCat });
            setNewSubCatName('');
            fetchSubCategories();
            fetchCategories(); // Refresh counts
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create subcategory');
        }
    };

    const addTag = async () => {
        if (!newTagName.trim() || !selectedSubCat) return;
        try {
            await adminApi.createTag({ name: newTagName.trim(), subCategoryId: selectedSubCat });
            setNewTagName('');
            fetchTags();
            fetchCategories(); // Refresh counts
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create tag');
        }
    };

    const startEdit = (id: string, name: string) => { setEditingId(id); setEditingName(name); };
    const cancelEdit = () => { setEditingId(null); setEditingName(''); };

    const saveEdit = async (type: 'category' | 'subcategory' | 'tag') => {
        if (!editingId || !editingName.trim()) return;
        try {
            if (type === 'category') { await adminApi.updateCategory(editingId, { name: editingName }); fetchCategories(); }
            else if (type === 'subcategory') { await adminApi.updateSubCategory(editingId, { name: editingName }); fetchSubCategories(); }
            else { await adminApi.updateTag(editingId, { name: editingName }); fetchTags(); }
            cancelEdit();
        } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to update'); }
    };

    const confirmDelete = (type: 'category' | 'subcategory' | 'tag', id: string) => {
        setDeleteDialog({ isOpen: true, type, id });
    };

    const deleteItem = async () => {
        const { type, id } = deleteDialog;
        if (!type || !id) return;
        try {
            if (type === 'category') {
                await adminApi.deleteCategory(id);
                if (selectedCat === id) { setSelectedCat(null); setSelectedSubCat(null); }
                fetchCategories();
            } else if (type === 'subcategory') {
                await adminApi.deleteSubCategory(id);
                if (selectedSubCat === id) setSelectedSubCat(null);
                fetchSubCategories();
                fetchCategories();
            } else {
                await adminApi.deleteTag(id);
                fetchTags();
                fetchCategories();
            }
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to delete'); }
        finally { setDeleteDialog({ isOpen: false, type: null, id: null }); }
    };

    const renderItem = (
        item: { _id: string; name: string },
        type: 'category' | 'subcategory' | 'tag',
        isSelected: boolean,
        onClick: () => void,
        extra?: React.ReactNode
    ) => (
        <div
            key={item._id}
            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors group ${
                isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent'
            }`}
            onClick={onClick}
        >
            {editingId === item._id ? (
                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(type); if (e.key === 'Escape') cancelEdit(); }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(type)}>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                        <X className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm truncate">{item.name}</span>
                        {extra}
                    </div>
                    <div className="hidden group-hover:flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item._id, item.name)}>
                            <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => confirmDelete(type, item._id)}>
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Taxonomy Manager</h1>
                <p className="text-muted-foreground">Manage categories, subcategories, and tags for lecture organization.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Categories Panel */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Categories
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex gap-2">
                            <Input placeholder="New category..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }} className="h-8 text-sm" />
                            <Button size="icon" className="h-8 w-8 shrink-0" onClick={addCategory}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-1 max-h-[400px] overflow-y-auto">
                            {categories.map((cat) => renderItem(
                                cat, 'category',
                                selectedCat === cat._id,
                                () => { setSelectedCat(cat._id); setSelectedSubCat(null); },
                                <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto shrink-0">
                                    {cat.subCategoryCount} sub / {cat.tagCount} tags
                                </Badge>
                            ))}
                            {categories.length === 0 && !loading && (
                                <p className="text-xs text-muted-foreground text-center py-4">No categories yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* SubCategories Panel */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" /> SubCategories
                            {selectedCat && <Badge variant="outline" className="text-[10px] ml-auto">
                                {categories.find(c => c._id === selectedCat)?.name}
                            </Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {selectedCat ? (
                            <>
                                <div className="flex gap-2">
                                    <Input placeholder="New subcategory..." value={newSubCatName} onChange={(e) => setNewSubCatName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') addSubCategory(); }} className="h-8 text-sm" />
                                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={addSubCategory}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                                    {subCategories.map((sub) => renderItem(
                                        sub, 'subcategory',
                                        selectedSubCat === sub._id,
                                        () => setSelectedSubCat(sub._id),
                                    ))}
                                    {subCategories.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">No subcategories yet</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-8">Select a category first</p>
                        )}
                    </CardContent>
                </Card>

                {/* Tags Panel */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Tag className="w-4 h-4" /> Tags
                            {selectedSubCat && <Badge variant="outline" className="text-[10px] ml-auto">
                                {subCategories.find(s => s._id === selectedSubCat)?.name}
                            </Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {selectedSubCat ? (
                            <>
                                <div className="flex gap-2">
                                    <Input placeholder="New tag..." value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') addTag(); }} className="h-8 text-sm" />
                                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={addTag}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                                    {tags.map((tag) => renderItem(
                                        tag, 'tag',
                                        false,
                                        () => {},
                                    ))}
                                    {tags.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">No tags yet</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-8">Select a subcategory first</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, type: null, id: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this {deleteDialog.type}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
