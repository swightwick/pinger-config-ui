'use client'

import { useEffect, useState, useRef } from 'react'
import { gsap } from 'gsap'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface KeywordConfig {
  discount: number
}

interface ChannelKeyword {
  keyword: string
  discount: number
}

interface BlacklistedChannel {
  channel_id: string
  nickname: string
}

interface UserConfig {
  global_keywords: Record<string, KeywordConfig>
  channel_keywords: Record<string, ChannelKeyword[]>
  negative_keywords: string[]
  blacklisted_channels: (string | BlacklistedChannel)[]
}

type ConfigData = Record<string, UserConfig>

// Animated wrapper component for new items
function AnimatedItem({ children, itemKey }: { children: React.ReactNode; itemKey: string }) {
  const itemRef = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!hasAnimated.current && itemRef.current) {
      gsap.fromTo(
        itemRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
      hasAnimated.current = true
    }
  }, [])

  return <div ref={itemRef}>{children}</div>
}

export default function Home() {
  const [configs, setConfigs] = useState<ConfigData | null>(null)
  const [originalConfigs, setOriginalConfigs] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [globalKeywordSort, setGlobalKeywordSort] = useState<'name' | 'discount'>('name')
  const [editingGlobalKeyword, setEditingGlobalKeyword] = useState<string | null>(null)
  const [tempGlobalKeywordValue, setTempGlobalKeywordValue] = useState<string>('')
  const [tempGlobalKeywordDiscount, setTempGlobalKeywordDiscount] = useState<string>('0')
  const [editingChannelKeyword, setEditingChannelKeyword] = useState<{channelId: string, idx: number} | null>(null)
  const [tempChannelKeywordValue, setTempChannelKeywordValue] = useState<string>('')
  const [tempChannelKeywordDiscount, setTempChannelKeywordDiscount] = useState<string>('0')
  const [globalOpen, setGlobalOpen] = useState<string | undefined>('global')
  const [channelOpen, setChannelOpen] = useState<string | undefined>('channel')
  const [negativeOpen, setNegativeOpen] = useState<string | undefined>('negative')
  const [blacklistOpen, setBlacklistOpen] = useState<string | undefined>('blacklist')
  const [newKeywordInput, setNewKeywordInput] = useState<string>('')
  const [newKeywordDiscount, setNewKeywordDiscount] = useState<string>('')
  const [showNewKeywordForm, setShowNewKeywordForm] = useState(false)
  const [showNewChannelKeywordForm, setShowNewChannelKeywordForm] = useState<string | null>(null)
  const [newChannelKeywordInput, setNewChannelKeywordInput] = useState<string>('')
  const [newChannelKeywordDiscount, setNewChannelKeywordDiscount] = useState<string>('')
  const channelIdInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({})
  const [focusChannelId, setFocusChannelId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/configs.json')
      .then(res => res.json())
      .then(data => {
        setConfigs(data)
        setOriginalConfigs(data)
        // Auto-select the first (and only) user
        const userIds = Object.keys(data)
        if (userIds.length > 0) {
          setSelectedUserId(userIds[0])
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading configs:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (configs && originalConfigs) {
      setHasUnsavedChanges(JSON.stringify(configs) !== JSON.stringify(originalConfigs))
    }
  }, [configs, originalConfigs])

  useEffect(() => {
    if (focusChannelId !== null) {
      const input = channelIdInputRefs.current[focusChannelId]
      if (input) {
        input.focus()
        setFocusChannelId(null)
      }
    }
  }, [focusChannelId])

  const handleSave = async () => {
    if (!configs || !selectedUserId) return

    // Validate all channel IDs are 19 digits
    const userConfig = configs[selectedUserId]
    const invalidChannels = Object.keys(userConfig.channel_keywords).filter(id => id.length !== 19)

    if (invalidChannels.length > 0) {
      setSaveMessage('✗ All Channel IDs must be 19 digits')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    setSaving(true)
    setSaveMessage('')
    try {
      const response = await fetch('/api/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configs),
      })

      if (response.ok) {
        setSaveMessage('✓ Saved successfully')
        setOriginalConfigs(configs)
        setHasUnsavedChanges(false)
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('✗ Failed to save')
      }
    } catch (err) {
      console.error('Error saving configs:', err)
      setSaveMessage('✗ Error saving')
    } finally {
      setSaving(false)
    }
  }

  const updateGlobalKeyword = (userId: string, oldKeyword: string, newKeyword: string, discount: number, isBlur: boolean = false) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const globalKeywords = { ...userConfig.global_keywords }

    // Only update the key when blurring (finishing edit)
    if (isBlur && oldKeyword !== newKeyword) {
      delete globalKeywords[oldKeyword]
      globalKeywords[newKeyword] = { discount }
    } else {
      // During typing, just update the discount
      globalKeywords[oldKeyword] = { discount }
    }

    userConfig.global_keywords = globalKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const deleteGlobalKeyword = (userId: string, keyword: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const globalKeywords = { ...userConfig.global_keywords }

    delete globalKeywords[keyword]
    userConfig.global_keywords = globalKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const addGlobalKeyword = (userId: string) => {
    if (!configs || !newKeywordInput.trim()) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const globalKeywords = { ...userConfig.global_keywords }

    // Add the new keyword with the specified discount
    globalKeywords[newKeywordInput.trim()] = { discount: parseInt(newKeywordDiscount) || 0 }
    userConfig.global_keywords = globalKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)

    // Reset form
    setNewKeywordInput('')
    setNewKeywordDiscount('')
    setShowNewKeywordForm(false)
  }

  const updateChannelKeyword = (userId: string, channelId: string, idx: number, keyword: string, discount: number) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }
    const keywords = [...(channelKeywords[channelId] || [])]

    keywords[idx] = { keyword, discount }
    channelKeywords[channelId] = keywords
    userConfig.channel_keywords = channelKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const updateChannelId = (userId: string, oldChannelId: string, newChannelId: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }

    if (oldChannelId !== newChannelId) {
      // Preserve order by rebuilding the object with the same key order
      const entries = Object.entries(channelKeywords)
      const newChannelKeywords: Record<string, ChannelKeyword[]> = {}

      for (const [key, value] of entries) {
        if (key === oldChannelId) {
          newChannelKeywords[newChannelId] = value
        } else {
          newChannelKeywords[key] = value
        }
      }

      userConfig.channel_keywords = newChannelKeywords

      // Update the form state if it's open for this channel
      if (showNewChannelKeywordForm === oldChannelId) {
        setShowNewChannelKeywordForm(newChannelId)
      }
    } else {
      userConfig.channel_keywords = channelKeywords
    }

    newConfigs[userId] = userConfig

    setConfigs(newConfigs)

    // Mark this channel ID for focus restoration
    setFocusChannelId(newChannelId)
  }

  const deleteChannelKeyword = (userId: string, channelId: string, idx: number) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }
    const keywords = [...(channelKeywords[channelId] || [])]

    keywords.splice(idx, 1)

    if (keywords.length === 0) {
      delete channelKeywords[channelId]
    } else {
      channelKeywords[channelId] = keywords
    }

    userConfig.channel_keywords = channelKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const addChannelKeyword = (userId: string, channelId: string) => {
    if (!configs || !newChannelKeywordInput.trim()) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }
    const keywords = [...(channelKeywords[channelId] || [])]

    keywords.push({ keyword: newChannelKeywordInput.trim(), discount: parseInt(newChannelKeywordDiscount) || 0 })
    channelKeywords[channelId] = keywords
    userConfig.channel_keywords = channelKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)

    // Reset form
    setNewChannelKeywordInput('')
    setNewChannelKeywordDiscount('')
    setShowNewChannelKeywordForm(null)
  }

  const addNewChannel = (userId: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }

    // Start with empty string for new channel ID
    const newChannelId = ''

    // Add new channel at the end
    const newChannelKeywords: Record<string, ChannelKeyword[]> = {}

    // Copy existing channels first
    for (const [key, value] of Object.entries(channelKeywords)) {
      newChannelKeywords[key] = value
    }

    // Add new channel at the end
    newChannelKeywords[newChannelId] = []

    userConfig.channel_keywords = newChannelKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)

    // Open the add keyword form for the new channel
    setShowNewChannelKeywordForm(newChannelId)
  }

  const updateNegativeKeyword = (userId: string, idx: number, keyword: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const negativeKeywords = [...userConfig.negative_keywords]

    negativeKeywords[idx] = keyword
    userConfig.negative_keywords = negativeKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const deleteNegativeKeyword = (userId: string, idx: number) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const negativeKeywords = [...userConfig.negative_keywords]

    negativeKeywords.splice(idx, 1)
    userConfig.negative_keywords = negativeKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const addNegativeKeyword = (userId: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const negativeKeywords = [...userConfig.negative_keywords]

    negativeKeywords.push('')
    userConfig.negative_keywords = negativeKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const updateBlacklistedChannel = (userId: string, idx: number, channelId: string, nickname: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const blacklistedChannels = [...userConfig.blacklisted_channels]

    blacklistedChannels[idx] = { channel_id: channelId, nickname }
    userConfig.blacklisted_channels = blacklistedChannels
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const deleteBlacklistedChannel = (userId: string, idx: number) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const blacklistedChannels = [...userConfig.blacklisted_channels]

    blacklistedChannels.splice(idx, 1)
    userConfig.blacklisted_channels = blacklistedChannels
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const addBlacklistedChannel = (userId: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const blacklistedChannels = [...userConfig.blacklisted_channels]

    blacklistedChannels.push({ channel_id: '', nickname: '' })
    userConfig.blacklisted_channels = blacklistedChannels
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    )
  }

  if (!configs) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xl text-red-400">Error loading configuration data</div>
      </div>
    )
  }

  const selectedUser = selectedUserId && configs ? [[selectedUserId, configs[selectedUserId]] as [string, UserConfig]] : []

  const sortGlobalKeywords = (keywords: Record<string, KeywordConfig>) => {
    const entries = Object.entries(keywords)
    // Separate keywords being edited or empty
    const beingEdited = entries.filter(([key]) => key === '' || key === editingGlobalKeyword)
    const notEditing = entries.filter(([key]) => key !== '' && key !== editingGlobalKeyword)

    // Sort keywords not being edited
    let sorted: [string, KeywordConfig][]
    if (globalKeywordSort === 'name') {
      sorted = notEditing.sort(([a], [b]) => a.localeCompare(b))
    } else {
      sorted = notEditing.sort(([, a], [, b]) => b.discount - a.discount)
    }

    // Add keywords being edited at the end
    return [...sorted, ...beingEdited]
  }


  return (
    <div className="min-h-screen bg-dark-navy py-8 px-4">
      <div className="max-w-8xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-7">
          <div className="flex items-center gap-4">
            <img src="/paragn-logo-white.png" alt="Paragon Logo" className="h-8 md:h-12" />
            <div>
              <h1 className="text-lg md:text-4xl font-bold text-white mb-2">Pinger config</h1>
              {selectedUserId && (
                <p className="text-gray-400">User: {selectedUserId}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {hasUnsavedChanges && !saveMessage && (
              <span className="text-sm text-red-600 font-medium">
                You have unsaved changes!
              </span>
            )}
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('✓') ? 'text-green' : 'text-red-400'}`}>
                {saveMessage}
              </span>
            )}
            <button
              onClick={handleSave}
              type='button'
              disabled={saving || !hasUnsavedChanges}
              className="px-6 py-2 bg-green text-black rounded-lg hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {selectedUser.map(([userId, config]) => (
            <div key={userId} className="">
              <div className="flex flex-col md:flex-row gap-4">
                  <div className='w-full'>
                  {/* Global Keywords */}
                  <Accordion
                    type="single"
                    className="w-full mb-4"
                    value={globalOpen}
                    onValueChange={setGlobalOpen}
                    collapsible
                  >
                    <AccordionItem value="global" className="border-border border px-4 rounded-lg">
                      <AccordionTrigger className="text-lg font-semibold text-gray-300 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center bg-gray-700 rounded-full w-8 h-8 text-sm text-white font-bold">
                              {Object.keys(config.global_keywords).length}
                            </span>
                            Global Keywords
                          </div>
                          {globalOpen === 'global' && (
                            <div className="flex items-center gap-2 animate-in fade-in duration-300">
                              <select
                                value={globalKeywordSort}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  setGlobalKeywordSort(e.target.value as 'name' | 'discount')
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded text-sm hover:bg-gray-700"
                              >
                                <option value="name">Name</option>
                                <option value="discount">% Off</option>
                              </select>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowNewKeywordForm(true)
                                }}
                                className="btn"
                                type='button'
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className='bg-transparent'>
                    {showNewKeywordForm && (
                      <div className="mb-4 p-3 bg-gradient-card rounded border border-border">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newKeywordInput}
                            onChange={(e) => setNewKeywordInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addGlobalKeyword(userId)
                              } else if (e.key === 'Escape') {
                                setShowNewKeywordForm(false)
                                setNewKeywordInput('')
                                setNewKeywordDiscount('')
                              }
                            }}
                            placeholder="Keyword name"
                            className="flex-1 text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none"
                            autoFocus
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={newKeywordDiscount}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '')
                              setNewKeywordDiscount(value)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addGlobalKeyword(userId)
                              } else if (e.key === 'Escape') {
                                setShowNewKeywordForm(false)
                                setNewKeywordInput('')
                                setNewKeywordDiscount('')
                              }
                            }}
                            placeholder="50"
                            className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none w-16"
                          />
                          <span className="text-sm text-gray-400">% off</span>
                          <button
                            onClick={() => addGlobalKeyword(userId)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                            type='button'
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowNewKeywordForm(false)
                              setNewKeywordInput('')
                              setNewKeywordDiscount('')
                            }}
                            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                            type='button'
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {Object.keys(config.global_keywords).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                        {sortGlobalKeywords(config.global_keywords).map(([keyword, data]) => (
                          <AnimatedItem key={`${userId}-global-${keyword}-${data.discount}`} itemKey={`${userId}-global-${keyword}-${data.discount}`}>
                            {editingGlobalKeyword === keyword ? (
                              <div className="flex items-center gap-2 bg-gradient-card px-3 py-2 rounded border border-border">
                                <input
                                  type="text"
                                  value={tempGlobalKeywordValue}
                                  onChange={(e) => setTempGlobalKeywordValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateGlobalKeyword(userId, keyword, tempGlobalKeywordValue, parseInt(tempGlobalKeywordDiscount) || 0, true)
                                      setEditingGlobalKeyword(null)
                                    } else if (e.key === 'Escape') {
                                      setEditingGlobalKeyword(null)
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Check if we're moving to another input in the same form
                                    const relatedTarget = e.relatedTarget as HTMLElement
                                    if (relatedTarget && relatedTarget.closest('.flex.items-center.gap-2') === e.currentTarget.closest('.flex.items-center.gap-2')) {
                                      return
                                    }
                                    setEditingGlobalKeyword(null)
                                  }}
                                  placeholder="Keyword name"
                                  className="flex-1 min-w-0 text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none text-sm"
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={tempGlobalKeywordDiscount}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '')
                                    setTempGlobalKeywordDiscount(value)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateGlobalKeyword(userId, keyword, tempGlobalKeywordValue, parseInt(tempGlobalKeywordDiscount) || 0, true)
                                      setEditingGlobalKeyword(null)
                                    } else if (e.key === 'Escape') {
                                      setEditingGlobalKeyword(null)
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Check if we're moving to another input in the same form
                                    const relatedTarget = e.relatedTarget as HTMLElement
                                    if (relatedTarget && relatedTarget.closest('.flex.items-center.gap-2') === e.currentTarget.closest('.flex.items-center.gap-2')) {
                                      return
                                    }
                                    setEditingGlobalKeyword(null)
                                  }}
                                  placeholder="0"
                                  className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none w-12 flex-shrink-0 text-sm"
                                />
                                <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">% off</span>
                                <button
                                  onClick={() => {
                                    updateGlobalKeyword(userId, keyword, tempGlobalKeywordValue, parseInt(tempGlobalKeywordDiscount) || 0, true)
                                    setEditingGlobalKeyword(null)
                                  }}
                                  className="px-2 py-1 bg-transparent text-green rounded hover:text-green text-xl flex-shrink-0"
                                  type='button'
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 bg-gradient-card px-3 py-2 rounded border border-border">
                                <span className="text-gray-200 font-medium">{keyword}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${data.discount === 0 ? 'text-red-400' : 'text-gray-400'}`}>{data.discount}% off</span>
                                  <button
                                    onClick={() => {
                                      setEditingGlobalKeyword(keyword)
                                      setTempGlobalKeywordValue(keyword)
                                      setTempGlobalKeywordDiscount(data.discount.toString())
                                    }}
                                    type='button'
                                    className="text-gray-400 hover:text-gray-200"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteGlobalKeyword(userId, keyword)}
                                    type='button'
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            )}
                          </AnimatedItem>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No global keywords</p>
                    )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* Negative Keywords */}
                  <Accordion
                    type="single"
                    className="w-full"
                    value={negativeOpen}
                    onValueChange={setNegativeOpen}
                    collapsible
                  >
                    <AccordionItem value="negative" className="border-border border px-4 rounded-lg">
                      <AccordionTrigger className="text-lg font-semibold text-gray-300 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center bg-gray-700 rounded-full w-8 h-8 text-sm text-white font-bold">
                              {config.negative_keywords.length}
                            </span>
                            Negative Keywords
                          </div>
                          {negativeOpen === 'negative' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addNegativeKeyword(userId)
                              }}
                              className="btn animate-in fade-in duration-300"
                              type='button'
                            >
                              +
                            </button>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                    {config.negative_keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {config.negative_keywords.map((keyword, idx) => (
                          <AnimatedItem key={`${userId}-negative-${idx}`} itemKey={`${userId}-negative-${idx}`}>
                            <div className="flex items-center gap-1 bg-red-900 text-red-200 px-3 py-1 rounded-full text-sm border border-red-800">
                            <input
                              type="text"
                              value={keyword}
                              onChange={(e) => updateNegativeKeyword(userId, idx, e.target.value)}
                              placeholder="Keyword"
                              className="bg-transparent outline-none border-b border-transparent hover:border-red-400 focus:border-red-400"
                              size={Math.max(1, keyword.length || 7)}
                            />
                            <button
                              onClick={() => deleteNegativeKeyword(userId, idx)}
                              className="text-red-300 hover:text-red-200 ml-1"
                              type='button'
                            >
                              ×
                            </button>
                            </div>
                          </AnimatedItem>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No negative keywords</p>
                    )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                </div>
                <div className='w-full'>
                  {/* Channel Keywords */}
                  <Accordion
                    type="single"
                    className="w-full mb-4"
                    value={channelOpen}
                    onValueChange={setChannelOpen}
                    collapsible
                  >
                    <AccordionItem value="channel" className="border-border border px-4 rounded-lg">
                      <AccordionTrigger className="text-lg font-semibold text-gray-300 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center bg-gray-700 rounded-full w-8 h-8 text-base text-white font-bold">
                              {Object.keys(config.channel_keywords).length}
                            </span>
                            Channel Keywords
                          </div>
                          {channelOpen === 'channel' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addNewChannel(userId)
                              }}
                              type='button'
                              className="btn animate-in fade-in duration-300"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                    {Object.keys(config.channel_keywords).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(config.channel_keywords).map(([channelId, keywords], idx) => (
                          <AnimatedItem key={`${userId}-channel-${idx}`} itemKey={`${userId}-channel-${idx}`}>
                            <div className="bg-gradient-card p-3 rounded border border-border">
                            <div className="text-sm mb-2 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Channel:</span>
                                <input
                                  ref={(el) => {
                                    channelIdInputRefs.current[channelId] = el
                                  }}
                                  type="text"
                                  value={channelId}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '')
                                    if (value.length <= 19) {
                                      updateChannelId(userId, channelId, value)
                                    }
                                  }}
                                  placeholder="Channel ID"
                                  autoFocus={channelId.length === 0}
                                  className={`text-gray-200 bg-black px-2 py-2 rounded border outline-none w-[200px] ${
                                    channelId.length === 19 ? 'border-gray-700 focus:border-gray-600' : 'border-orange-500 focus:border-orange-400'
                                  }`}
                                />
                              </div>
                              <button
                                onClick={() => setShowNewChannelKeywordForm(channelId)}
                                className="btn-sm"
                                type='button'
                              >
                                + Keyword
                              </button>
                            </div>
                            {showNewChannelKeywordForm === channelId && (
                              <div className={`p-3 bg-gradient-card rounded border border-border ${keywords.length > 0 ? 'mb-4' : ''}`}>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={newChannelKeywordInput}
                                    onChange={(e) => setNewChannelKeywordInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        addChannelKeyword(userId, channelId)
                                      } else if (e.key === 'Escape') {
                                        setShowNewChannelKeywordForm(null)
                                        setNewChannelKeywordInput('')
                                        setNewChannelKeywordDiscount('')
                                      }
                                    }}
                                    placeholder="Keyword name"
                                    className="flex-1 text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none"
                                    autoFocus={channelId.length === 19}
                                  />
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={newChannelKeywordDiscount}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '')
                                      setNewChannelKeywordDiscount(value)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        addChannelKeyword(userId, channelId)
                                      } else if (e.key === 'Escape') {
                                        setShowNewChannelKeywordForm(null)
                                        setNewChannelKeywordInput('')
                                        setNewChannelKeywordDiscount('')
                                      }
                                    }}
                                    placeholder="0"
                                    className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none w-16"
                                  />
                                  <span className="text-sm text-gray-400">% off</span>
                                  <button
                                    onClick={() => addChannelKeyword(userId, channelId)}
                                    className="px-4 py-2 border border-green text-green rounded hover:bg-green-700 font-medium"
                                    type='button'
                                  >
                                    Add
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowNewChannelKeywordForm(null)
                                      setNewChannelKeywordInput('')
                                      setNewChannelKeywordDiscount('')
                                    }}
                                    className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-gray-600"
                                    type='button'
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                            {keywords.map((kw) => {
                              const idx = keywords.findIndex(k => k.keyword === kw.keyword && k.discount === kw.discount)
                              const isEditing = editingChannelKeyword?.channelId === channelId && editingChannelKeyword?.idx === idx
                              return (
                                <AnimatedItem key={`${userId}-channel-${channelId}-${idx}`} itemKey={`${userId}-channel-${channelId}-${idx}`}>
                                  {isEditing ? (
                                    <div className="flex items-center gap-2 bg-gradient-card px-3 py-2 rounded border border-border">
                                      <input
                                        type="text"
                                        value={tempChannelKeywordValue}
                                        onChange={(e) => setTempChannelKeywordValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            updateChannelKeyword(userId, channelId, idx, tempChannelKeywordValue, parseInt(tempChannelKeywordDiscount) || 0)
                                            setEditingChannelKeyword(null)
                                          } else if (e.key === 'Escape') {
                                            setEditingChannelKeyword(null)
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const relatedTarget = e.relatedTarget as HTMLElement
                                          if (relatedTarget && relatedTarget.closest('.flex.items-center.gap-2') === e.currentTarget.closest('.flex.items-center.gap-2')) {
                                            return
                                          }
                                          setEditingChannelKeyword(null)
                                        }}
                                        placeholder="Keyword name"
                                        className="flex-1 min-w-0 text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none text-sm"
                                        autoFocus
                                      />
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={tempChannelKeywordDiscount}
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/\D/g, '')
                                          setTempChannelKeywordDiscount(value)
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            updateChannelKeyword(userId, channelId, idx, tempChannelKeywordValue, parseInt(tempChannelKeywordDiscount) || 0)
                                            setEditingChannelKeyword(null)
                                          } else if (e.key === 'Escape') {
                                            setEditingChannelKeyword(null)
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const relatedTarget = e.relatedTarget as HTMLElement
                                          if (relatedTarget && relatedTarget.closest('.flex.items-center.gap-2') === e.currentTarget.closest('.flex.items-center.gap-2')) {
                                            return
                                          }
                                          setEditingChannelKeyword(null)
                                        }}
                                        placeholder="0"
                                        className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none w-12 flex-shrink-0 text-sm"
                                      />
                                      <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">% off</span>
                                      <button
                                        onClick={() => {
                                          updateChannelKeyword(userId, channelId, idx, tempChannelKeywordValue, parseInt(tempChannelKeywordDiscount) || 0)
                                          setEditingChannelKeyword(null)
                                        }}
                                        className="px-2 py-1 bg-transparent text-green rounded hover:text-green text-xl flex-shrink-0"
                                        type='button'
                                      >
                                        ✓
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2 bg-gradient-card px-3 py-2 rounded border border-border">
                                      <span className="text-gray-200 font-medium">{kw.keyword}</span>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm ${kw.discount === 0 ? 'text-red-400' : 'text-gray-400'}`}>{kw.discount}% off</span>
                                        <button
                                          onClick={() => {
                                            setEditingChannelKeyword({channelId, idx})
                                            setTempChannelKeywordValue(kw.keyword)
                                            setTempChannelKeywordDiscount(kw.discount.toString())
                                          }}
                                          type='button'
                                          className="text-gray-400 hover:text-gray-200"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => deleteChannelKeyword(userId, channelId, idx)}
                                          type='button'
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </AnimatedItem>
                              )
                            })}
                            </div>
                            </div>
                          </AnimatedItem>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No channel keywords</p>
                    )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  {/* Blacklisted Channels */}
                  <Accordion
                    type="single"
                    className="w-full"
                    value={blacklistOpen}
                    onValueChange={setBlacklistOpen}
                    collapsible
                  >
                    <AccordionItem value="blacklist" className="border-border border px-4 rounded-lg">
                      <AccordionTrigger className="text-lg font-semibold text-gray-300 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center bg-gray-700 rounded-full w-8 h-8 text-sm text-white font-bold">
                              {config.blacklisted_channels.length}
                            </span>
                            Blacklisted Channels
                          </div>
                          {blacklistOpen === 'blacklist' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addBlacklistedChannel(userId)
                              }}
                              className="btn animate-in fade-in duration-300"
                              type='button'
                            >
                              +
                            </button>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                    {config.blacklisted_channels.length > 0 ? (
                      <div className="space-y-3">
                        {config.blacklisted_channels.map((channel, idx) => {
                          const channelData = typeof channel === 'string'
                            ? { channel_id: channel, nickname: channel }
                            : channel
                          return (
                            <AnimatedItem key={`${userId}-blacklist-${idx}`} itemKey={`${userId}-blacklist-${idx}`}>

                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={channelData.channel_id}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '')
                                    if (value.length <= 19) {
                                      updateBlacklistedChannel(userId, idx, value, channelData.nickname)
                                    }
                                  }}
                                  placeholder="Channel ID (19 digits)"
                                  className={`text-gray-200 bg-black px-2 py-2 rounded border outline-none flex-1 ${
                                    channelData.channel_id.length === 19 ? 'border-gray-700 focus:border-gray-600' : 'border-orange-500 focus:border-orange-400'
                                  }`}
                                />
                                <input
                                  type="text"
                                  value={channelData.nickname}
                                  onChange={(e) => updateBlacklistedChannel(userId, idx, channelData.channel_id, e.target.value)}
                                  placeholder="Nickname"
                                  className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-600 outline-none flex-1"
                                />
                                <button
                                  onClick={() => deleteBlacklistedChannel(userId, idx)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  ×
                                </button>
                              </div>
                            </AnimatedItem>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No blacklisted channels</p>
                    )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
