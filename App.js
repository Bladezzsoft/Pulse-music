import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Animated, PanResponder, Platform, Alert, StatusBar, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#09090D', panel: '#17141E', panel2: '#211B2B',
  text: '#F7F3FF', muted: '#96909F', purple: '#C5A0FF',
  line: '#302A38', accent: '#E0CCFF'
};

const demoTracks = [
  { id: 'demo-1', title: 'Midnight Pulse', artist: 'PULSE Radio', uri: null, demo: true },
  { id: 'demo-2', title: 'After Dark', artist: 'Demo Library', uri: null, demo: true },
  { id: 'demo-3', title: 'Memory Reboot', artist: 'Demo Library', uri: null, demo: true }
];


const artistCatalog = [
  { name: 'The Weeknd', genre: 'R&B / Pop', bio: 'Канадский артист, сочетающий современный R&B, поп-музыку и электронное звучание.' },
  { name: 'Billie Eilish', genre: 'Alternative Pop', bio: 'Американская певица с минималистичным продакшеном и альтернативной поп-эстетикой.' },
  { name: 'Dua Lipa', genre: 'Pop / Dance', bio: 'Британская поп-исполнительница с влиянием диско и танцевальной музыки.' },
  { name: 'Taylor Swift', genre: 'Pop / Songwriter', bio: 'Американская автор-исполнительница, работающая в поп-музыке, фолке и кантри.' },
  { name: 'Kendrick Lamar', genre: 'Hip-Hop', bio: 'Американский рэпер и автор текстов, известный концептуальными альбомами.' },
  { name: 'Drake', genre: 'Hip-Hop / R&B', bio: 'Канадский рэпер и певец, соединяющий хип-хоп и мелодичный R&B.' },
  { name: 'Lana Del Rey', genre: 'Alternative Pop', bio: 'Американская певица с кинематографичным звучанием.' },
  { name: 'Arctic Monkeys', genre: 'Indie Rock', bio: 'Британская группа альтернативного и инди-рока.' },
  { name: 'Tame Impala', genre: 'Psychedelic Pop', bio: 'Музыкальный проект Кевина Паркера на стыке психоделического рока и поп-музыки.' },
  { name: 'Daft Punk', genre: 'Electronic', bio: 'Французский электронный дуэт, повлиявший на хаус и электронную музыку.' },
  { name: 'Radiohead', genre: 'Alternative Rock', bio: 'Британская группа, известная экспериментальным альтернативным роком.' },
  { name: 'Frank Ocean', genre: 'Alternative R&B', bio: 'Американский певец и автор песен на стыке R&B и соула.' },
  { name: 'SZA', genre: 'R&B', bio: 'Американская R&B-исполнительница с элементами соула и альтернативного попа.' },
  { name: 'Tyler, The Creator', genre: 'Hip-Hop', bio: 'Американский рэпер и продюсер с эклектичным музыкальным стилем.' },
  { name: 'Оксимирон', genre: 'Хип-хоп', bio: 'Русскоязычный рэпер и автор текстов.' },
  { name: 'Miyagi & Andy Panda', genre: 'Хип-хоп / Регги', bio: 'Музыкальный дуэт с мелодичным звучанием и влияниями регги и хип-хопа.' },
  { name: 'Земфира', genre: 'Рок', bio: 'Российская рок-исполнительница и автор песен.' },
  { name: 'Кино', genre: 'Рок', bio: 'Советская рок-группа, одна из ключевых в истории русскоязычного рока.' },
  { name: 'Баста', genre: 'Хип-хоп', bio: 'Российский рэпер, автор песен и музыкальный продюсер.' },
  { name: 'Монеточка', genre: 'Поп', bio: 'Российская певица и автор песен с поп- и инди-звучанием.' }
];

function Plasma({ style }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient
        colors={['#21152F', '#09090D', '#151127', '#09090D']}
        locations={[0, 0.42, 0.72, 1]}
        start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
    </View>
  );
}

function Artwork({ size = 58, variant = 0 }) {
  const palettes = [
    ['#D6B8FF', '#65427E', '#111018'],
    ['#B9C9FF', '#45416F', '#101018'],
    ['#E7D5FF', '#765C8D', '#111018']
  ];
  return (
    <LinearGradient colors={palettes[variant % palettes.length]} style={[styles.art, { width: size, height: size, borderRadius: Math.max(10, size * 0.16) }]}>
      <View style={[styles.artOrb, { width: size * 0.62, height: size * 0.62, borderRadius: size }]} />
      <View style={[styles.artRing, { width: size * 0.82, height: size * 0.82, borderRadius: size }]} />
    </LinearGradient>
  );
}

function formatTime(value = 0) {
  const n = Math.max(0, Math.floor(value));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('Home');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [queue, setQueue] = useState([]);
  const [repeat, setRepeat] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [shuffle, setShuffle] = useState(false);
  const [catalogArtists, setCatalogArtists] = useState([]);
  const [popularTracks, setPopularTracks] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  const expandAnim = useRef(new Animated.Value(0)).current;
  const current = tracks.find(t => t.id === currentId) || popularTracks.find(t => t.id === currentId) || null;
  const allTracks = useMemo(() => [...tracks, ...popularTracks], [tracks, popularTracks]);

  useEffect(() => {
    let active = true;
    fetch('https://api.deezer.com/chart/0/tracks?limit=30')
      .then(r => r.json())
      .then(data => {
        if (!active || !Array.isArray(data.data)) return;
        setPopularTracks(data.data.map(t => ({
          id: `deezer-${t.id}`, title: t.title, artist: t.artist?.name || 'Unknown artist',
          uri: t.preview || null, cover: t.album?.cover_medium, externalUrl: t.link,
          duration: t.duration, source: 'Deezer'
        })));
      })
      .catch(() => { if (active) setCatalogError('Не удалось загрузить чарты. Проверь подключение к интернету.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const term = query.trim();
    if (!term) { setCatalogArtists([]); return; }
    setCatalogLoading(true);
    const timer = setTimeout(() => {
      fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(term)}&limit=25`)
        .then(r => r.json())
        .then(data => {
          if (!active) return;
          setCatalogArtists((data.data || []).map(a => ({
            name: a.name, genre: 'Артист · мировой каталог',
            bio: 'Профиль из открытого музыкального каталога.',
            id: a.id, picture: a.picture_medium, fans: a.nb_fan, link: a.link
          })));
        })
        .catch(() => { if (active) setCatalogArtists([]); })
        .finally(() => { if (active) setCatalogLoading(false); });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  const onPlaybackStatus = useCallback(status => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsPlaying(!!status.isPlaying);
    if (status.didJustFinish && !repeat) nextTrack();
    if (status.didJustFinish && repeat && sound) sound.replayAsync();
  }, [sound, repeat, tracks, currentId]);

  async function loadTrack(track, autoplay = true) {
    if (!track) return;
    if (!track.uri) {
      Alert.alert('Демо-трек', 'Это демонстрационная запись интерфейса. Добавь аудиофайл через «Импорт», чтобы проверить настоящее воспроизведение.');
      setCurrentId(track.id);
      setExpanded(true);
      return;
    }
    try {
      if (sound) await sound.unloadAsync();
      const { sound: nextSound, status } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: autoplay, progressUpdateIntervalMillis: 400 },
        onPlaybackStatus
      );
      setSound(nextSound);
      setCurrentId(track.id);
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(autoplay);
    } catch (e) {
      Alert.alert('Не удалось открыть аудио', 'Проверь, что файл доступен и имеет поддерживаемый формат.');
    }
  }

  async function togglePlay() {
    if (!current) {
      if (tracks.length) return loadTrack(tracks[0]);
      return Alert.alert('Библиотека пуста', 'Сначала импортируй аудиофайл с устройства.');
    }
    if (!current.uri) {
      return Alert.alert('Демо-трек', 'Добавь собственный аудиофайл, чтобы включить настоящее воспроизведение.');
    }
    if (!sound) return loadTrack(current);
    try {
      const status = await sound.getStatusAsync();
      if (status.isPlaying) await sound.pauseAsync();
      else await sound.playAsync();
    } catch {}
  }

  async function nextTrack() {
    if (!tracks.length) return;
    let index = tracks.findIndex(t => t.id === currentId);
    if (shuffle && tracks.length > 1) {
      let next = index;
      while (next === index) next = Math.floor(Math.random() * tracks.length);
      index = next;
    } else index = (index + 1 + tracks.length) % tracks.length;
    await loadTrack(tracks[index]);
  }

  async function previousTrack() {
    if (!tracks.length) return;
    if (position > 3000 && sound) return sound.setPositionAsync(0);
    const index = tracks.findIndex(t => t.id === currentId);
    await loadTrack(tracks[(index - 1 + tracks.length) % tracks.length]);
  }

  async function importAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*', multiple: true, copyToCacheDirectory: true
      });
      if (result.canceled) return;
      const added = result.assets.map((asset, i) => ({
        id: `local-${Date.now()}-${i}`,
        title: asset.name.replace(/\.[^/.]+$/, ''),
        artist: 'Локальный файл',
        uri: asset.uri,
        demo: false
      }));
      setTracks(prev => [...prev, ...added]);
      setTab('Library');
      Alert.alert('Импорт завершён', `Добавлено файлов: ${added.length}`);
    } catch {
      Alert.alert('Ошибка импорта', 'Не удалось получить доступ к выбранному файлу.');
    }
  }


  async function importPlaylistFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/*', 'application/json', 'application/octet-stream'], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0], raw = await (await fetch(result.assets[0].uri)).text();
      const lower = (asset.name || '').toLowerCase();
      let rows = [];
      if (lower.endsWith('.m3u') || lower.endsWith('.m3u8')) {
        let pending = '';
        rows = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean).flatMap(line => {
          if (line.startsWith('#EXTINF:')) { pending = line.split(',').slice(1).join(',').trim(); return []; }
          if (line.startsWith('#')) return [];
          const title = pending || line.split('/').pop().replace(/\.[^.]+$/, ''); pending = '';
          return [{ title, artist: 'Импортированный плейлист', uri: line.startsWith('http') ? null : line }];
        });
      } else if (lower.endsWith('.json')) {
        const data = JSON.parse(raw), list = Array.isArray(data) ? data : (data.tracks || data.items || data.library || data.playlistTracks || []);
        rows = list.map(item => {
          const t = item.track || item, a = t.artists || t.artist || item.artists || item.artist || 'Неизвестный исполнитель';
          return { title: t.name || t.title || item.trackName || item.name || 'Без названия',
            artist: Array.isArray(a) ? a.map(x => typeof x === 'string' ? x : x.name).filter(Boolean).join(', ') : (typeof a === 'object' ? a.name : a), uri: null };
        });
      } else {
        const parseCsv = line => {
          const cells = []; let cell = '', quoted = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i++; }
            else if (ch === '"') quoted = !quoted;
            else if (ch === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
            else cell += ch;
          }
          cells.push(cell.trim()); return cells;
        };
        const lines = raw.split(/\r?\n/).filter(line => line.trim());
        const header = (lines.length ? parseCsv(lines[0]) : []).map(x => x.toLowerCase().replace(/^\uFEFF/, '').trim());
        const titleIndex = header.findIndex(x => ['title','track','track name','name','song'].includes(x));
        const artistIndex = header.findIndex(x => ['artist','artist name','artists','performer'].includes(x));
        const hasHeader = titleIndex >= 0 || artistIndex >= 0;
        rows = lines.slice(hasHeader ? 1 : 0).map(line => {
          const cells = parseCsv(line);
          return { title: cells[hasHeader ? Math.max(0, titleIndex) : 0] || '',
            artist: cells[hasHeader && artistIndex >= 0 ? artistIndex : 1] || 'Неизвестный исполнитель', uri: null };
        });
      }
      const added = rows.filter(x => x.title).map((x,i) => ({ id:`import-${Date.now()}-${i}`, title:x.title, artist:x.artist||'Неизвестный исполнитель', uri:x.uri||null, importedMetadata:true }));
      if (!added.length) return Alert.alert('Плейлист не распознан', 'Поддерживаются M3U, JSON и CSV с колонками title, artist.');
      setTracks(prev => [...prev, ...added]); setTab('Library');
      Alert.alert('Импортирован список', `Добавлено записей: ${added.length}. Для воспроизведения нужны локальные аудиофайлы.`);
    } catch { Alert.alert('Ошибка импорта', 'Не удалось прочитать файл. Проверь формат M3U, JSON или CSV.'); }
  }
  function connectProvider(provider) {
    Alert.alert(`Подключение ${provider}`, 'Для прямого переноса нужен официальный OAuth-доступ и серверная настройка приложения. Сейчас можно импортировать экспортированный M3U, JSON или CSV.');
  }

  function openPlayer() {
    setExpanded(true);
    Animated.spring(expandAnim, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 170, mass: 0.85 }).start();
  }
  function closePlayer() {
    Animated.spring(expandAnim, { toValue: 0, useNativeDriver: true, damping: 25, stiffness: 190 }).start(({ finished }) => {
      if (finished) setExpanded(false);
    });
  }

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => { if (g.dy > 75) closePlayer(); }
  })).current;

  const filtered = allTracks.filter(t => `${t.title} ${t.artist}`.toLowerCase().includes(query.toLowerCase()));
  const artistNames = [...new Set(allTracks.flatMap(t => String(t.artist || '').split(',').map(a => a.trim()).filter(Boolean)))];
  const localVisibleArtists = artistCatalog.filter(a => `${a.name} ${a.genre}`.toLowerCase().includes(query.toLowerCase()));
  const visibleArtists = query.trim()
    ? [...catalogArtists, ...localVisibleArtists].filter((a, i, arr) => arr.findIndex(x => x.name.toLowerCase() === a.name.toLowerCase()) === i)
    : localVisibleArtists;
  const artistTracks = selectedArtist ? allTracks.filter(t => String(t.artist || '').split(',').map(a => a.trim()).includes(selectedArtist)) : [];
  const isFavorite = current && favorites.includes(current.id);

  async function seekTo(value) {
    const ms = Math.max(0, Math.min(duration, value * duration / 100));
    setPosition(ms);
    if (sound) try { await sound.setPositionAsync(ms); } catch {}
  }

  const miniTranslate = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 110] });
  const fullTranslate = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [42, 0] });
  const fullOpacity = expandAnim;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.root}>
        <Plasma />
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>PULSE<Text style={{ color: C.purple }}>.</Text></Text>
            <Text style={styles.tagline}>MUSIC. YOUR WAY.</Text>
          </View>
          <TouchableOpacity style={styles.avatar}><Text style={{ color: C.purple, fontSize: 18 }}>◉</Text></TouchableOpacity>
        </View>

        {tab === 'Home' && !selectedArtist && (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>МУЗЫКА В ТВОЁМ РИТМЕ</Text>
            <Text style={styles.heroTitle}>Enter the{' '}
              <Text style={{ color: C.purple }}>frequency.</Text>
            </Text>
            <Text style={styles.sub}>Музыка без границ.</Text>
            <LinearGradient colors={['#30203F', '#17131F', '#292039']} style={styles.banner}>
              <Text style={styles.eyebrowPurple}>PULSE COLLECTION</Text>
              <Text style={styles.bannerTitle}>Your night.{"\n"}Your soundtrack.</Text>
              <Text style={styles.sub}>Одна библиотека для твоего звука.</Text>
              <View style={styles.bannerOrb} />
            </LinearGradient>
            <Section title="Мировой чарт" action="ТОП · Deezer" />
            {popularTracks.slice(0, 10).map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} active={currentId === t.id} onPress={() => loadTrack(t)} />
            ))}
            {!!catalogError && <Text style={styles.sub}>{catalogError}</Text>}
            <Section title="Твоя библиотека" action={`${tracks.length} треков`} />
            {tracks.length === 0 ? (
              <TouchableOpacity style={styles.emptyCard} onPress={importAudio}>
                <Text style={styles.emptyIcon}>＋</Text>
                <Text style={styles.trackTitle}>Добавь свою музыку</Text>
                <Text style={styles.sub}>Импорт аудиофайлов с устройства</Text>
              </TouchableOpacity>
            ) : tracks.slice(0, 4).map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} active={currentId === t.id} onPress={() => loadTrack(t)} />
            ))}
            <Section title="Исполнители" action={`${artistNames.length} профилей`} />
            {artistNames.length ? artistNames.slice(0, 8).map((artist, i) => (
              <TouchableOpacity key={artist} style={styles.trackRow} onPress={() => setSelectedArtist(artist)}>
                <LinearGradient colors={['#5D4776','#17131F']} style={styles.artistAvatar}><Text style={styles.artistInitial}>{artist.slice(0,1).toUpperCase()}</Text></LinearGradient>
                <View style={{flex:1}}><Text style={styles.trackTitle}>{artist}</Text><Text style={styles.sub}>{allTracks.filter(t=>String(t.artist).split(',').map(a=>a.trim()).includes(artist)).length} треков в библиотеке</Text></View><Text style={{color:C.purple}}>›</Text>
              </TouchableOpacity>
            )) : <Text style={styles.sub}>Исполнители из твоей библиотеки появятся здесь.</Text>}
            <Section title="Мировой каталог артистов" action="Поиск по миру" />
            <TouchableOpacity style={styles.importButton} onPress={() => setTab('Search')}>
              <Text style={styles.importText}>⌕  Найти любого исполнителя</Text>
            </TouchableOpacity>
            {artistCatalog.slice(0, 5).map(artist => (
              <TouchableOpacity key={artist.name} style={styles.trackRow} onPress={() => setSelectedArtist(artist.name)}>
                <LinearGradient colors={['#5D4776','#17131F']} style={styles.artistAvatar}><Text style={styles.artistInitial}>{artist.name.slice(0,1).toUpperCase()}</Text></LinearGradient>
                <View style={{flex:1}}><Text style={styles.trackTitle}>{artist.name}</Text><Text style={styles.sub}>{artist.genre}</Text></View><Text style={{color:C.purple}}>›</Text>
              </TouchableOpacity>
            ))}
            <Section title="Быстрые действия" />
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionCard} onPress={importAudio}><Text style={styles.actionIcon}>⇧</Text><Text style={styles.trackTitle}>Импорт музыки</Text><Text style={styles.sub}>С устройства</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => setTab('Transfer')}><Text style={styles.actionIcon}>⇄</Text><Text style={styles.trackTitle}>Перенос</Text><Text style={styles.sub}>Между сервисами</Text></TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {tab === 'Search' && !selectedArtist && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Поиск</Text>
            <TextInput value={query} onChangeText={setQuery} placeholder="Трек или исполнитель" placeholderTextColor={C.muted} style={styles.search} />
            <ScrollView>
              <Section title="Треки" action={`${filtered.length}`} />
              {filtered.map((t, i) => <TrackRow key={t.id} track={t} index={i} active={currentId === t.id} onPress={() => loadTrack(t)} />)}
              <Section title="Популярные треки" action="Мировой чарт" />
              {popularTracks.filter(t => `${t.title} ${t.artist}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12).map((t, i) => <TrackRow key={t.id} track={t} index={i} active={currentId === t.id} onPress={() => loadTrack(t)} />)}
              <Section title="Артисты со всего мира" action={catalogLoading ? 'Поиск…' : `${visibleArtists.length} результатов`} />
              {visibleArtists.map(artist => (
                <TouchableOpacity key={artist.name} style={styles.trackRow} onPress={() => setSelectedArtist(artist.name)}>
                  <LinearGradient colors={['#5D4776','#17131F']} style={styles.artistAvatar}><Text style={styles.artistInitial}>{artist.name.slice(0,1).toUpperCase()}</Text></LinearGradient>
                  <View style={{flex:1}}><Text style={styles.trackTitle}>{artist.name}</Text><Text style={styles.sub}>{artist.genre}</Text></View><Text style={{color:C.purple}}>›</Text>
                </TouchableOpacity>
              ))}
              {!filtered.length && !visibleArtists.length && !catalogLoading && <Text style={styles.sub}>Введи имя артиста для поиска по мировому каталогу.</Text>}
            </ScrollView>
          </View>
        )}

        {tab === 'Library' && !selectedArtist && (
          <View style={styles.content}>
            <Section title="Моя библиотека" action={`${tracks.length} треков`} />
            <TouchableOpacity style={styles.importButton} onPress={importAudio}><Text style={styles.importText}>＋  Импортировать аудиофайлы</Text></TouchableOpacity>
            <TouchableOpacity style={styles.importButton} onPress={importPlaylistFile}><Text style={styles.importText}>⇧  Импортировать плейлист M3U / JSON / CSV</Text></TouchableOpacity>
            <ScrollView>
              {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} active={currentId === t.id} onPress={() => loadTrack(t)} />)}
              {!tracks.length && <Text style={styles.sub}>Здесь появятся импортированные треки.</Text>}
            </ScrollView>
            <Section title="Избранное" />
            {tracks.filter(t => favorites.includes(t.id)).map((t, i) => <TrackRow key={t.id} track={t} index={i} onPress={() => loadTrack(t)} />)}
          </View>
        )}

        {tab === 'Transfer' && !selectedArtist && (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.sectionTitle}>Перенос музыки</Text>
            <Text style={styles.sub}>Импортируй экспортированный плейлист. Прямое подключение сервисов требует официальной авторизации.</Text>
            <TouchableOpacity style={styles.importButton} onPress={importPlaylistFile}><Text style={styles.importText}>⇧  Импортировать M3U / JSON / CSV</Text></TouchableOpacity>
            <Section title="Музыкальные сервисы" />
            {['Spotify', 'Яндекс Музыка', 'VK Музыка', 'Apple Music', 'Deezer'].map(name => (
              <TouchableOpacity key={name} style={styles.serviceRow} onPress={() => connectProvider(name)}>
                <View style={styles.serviceIcon}><Text style={{color:C.purple,fontWeight:'800'}}>{name[0]}</Text></View>
                <View style={{flex:1}}><Text style={styles.trackTitle}>{name}</Text><Text style={styles.sub}>OAuth-интеграция не настроена</Text></View>
                <Text style={styles.mutedSmall}>Настроить ›</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.noteCard}><Text style={styles.trackTitle}>Что переносится</Text><Text style={styles.sub}>M3U, JSON и CSV добавляют названия треков и исполнителей. Чарты и поиск каталога загружаются из Deezer. Для найденных треков доступен короткий preview, если он предоставлен правообладателем. Полные записи из стриминговых сервисов не скачиваются.</Text></View>
          </ScrollView>
        )}
        {selectedArtist && (
          <View style={styles.content}>
            <TouchableOpacity onPress={() => setSelectedArtist(null)} style={styles.backButton}><Text style={styles.importText}>‹  Все исполнители</Text></TouchableOpacity>
            <LinearGradient colors={['#4B315F','#191520','#09090D']} style={styles.artistHero}>
              <View style={styles.artistBigAvatar}><Text style={styles.artistBigInitial}>{selectedArtist.slice(0,1).toUpperCase()}</Text></View>
              <Text style={styles.artistName}>{selectedArtist}</Text>
              <Text style={styles.sub}>{(catalogArtists.find(a => a.name === selectedArtist) || artistCatalog.find(a => a.name === selectedArtist))?.genre || 'Исполнитель из каталога'}</Text>
              <Text style={styles.mutedSmall}>{(catalogArtists.find(a => a.name === selectedArtist) || artistCatalog.find(a => a.name === selectedArtist))?.bio || 'Профиль исполнителя из мирового каталога.'}</Text>
              <Text style={styles.mutedSmall}>{artistTracks.length} треков в твоей библиотеке</Text>
            </LinearGradient>
            <Section title="Треки исполнителя" />
            <ScrollView>{artistTracks.map((t,i)=><TrackRow key={t.id} track={t} index={i} active={currentId===t.id} onPress={()=>loadTrack(t)}/>)}</ScrollView>
          </View>
        )}

        {!selectedArtist && <View style={styles.bottomNav}>
          {[['Home', '⌂', 'Главная'], ['Search', '⌕', 'Поиск'], ['Library', '▤', 'Библиотека'], ['Transfer', '⇄', 'Перенос']].map(([key, icon, label]) => (
            <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.navItem}>
              <Text style={[styles.navIcon, tab === key && styles.navActive]}>{icon}</Text>
              <Text style={[styles.navLabel, tab === key && styles.navActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>}

        {current && !expanded && (
          <Animated.View style={[styles.miniPlayer, { transform: [{ translateY: miniTranslate }], opacity: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            <TouchableOpacity style={styles.miniMain} onPress={openPlayer}>
              <Artwork size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.trackTitle}>{current.title}</Text>
                <Text numberOfLines={1} style={styles.sub}>{current.artist}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={styles.miniControl}><Text style={styles.controlText}>{isPlaying ? 'Ⅱ' : '▶'}</Text></TouchableOpacity>
            <TouchableOpacity onPress={nextTrack} style={styles.miniControl}><Text style={styles.controlText}>≫</Text></TouchableOpacity>
            <TouchableOpacity onPress={openPlayer} style={styles.miniControl}><Text style={styles.controlText}>⌃</Text></TouchableOpacity>
          </Animated.View>
        )}

        {expanded && current && (
          <Animated.View style={[styles.fullPlayer, { opacity: fullOpacity, transform: [{ translateY: fullTranslate }] }]}>
            <View style={styles.fullTop} {...pan.panHandlers}>
              <TouchableOpacity onPress={closePlayer} style={styles.closeButton}><Text style={styles.closeGlyph}>⌄</Text></TouchableOpacity>
              <View style={{ alignItems: 'center' }}><Text style={styles.eyebrow}>NOW PLAYING</Text><Text style={styles.fullTopTitle}>СЕЙЧАС ИГРАЕТ</Text></View>
              <TouchableOpacity style={styles.closeButton}><Text style={styles.closeGlyph}>•••</Text></TouchableOpacity>
            </View>
            <View style={styles.fullContent} {...pan.panHandlers}>
              <View style={styles.bigArtworkWrap}><Artwork size={290} variant={tracks.findIndex(t => t.id === current.id)} /></View>
              <View style={styles.songInfo}>
                <View style={{ flex: 1 }}><Text style={styles.bigSongTitle} numberOfLines={1}>{current.title}</Text><Text style={styles.sub}>{current.artist}</Text></View>
                <TouchableOpacity onPress={() => setFavorites(prev => isFavorite ? prev.filter(x => x !== current.id) : [...prev, current.id])}><Text style={styles.heart}>{isFavorite ? '♥' : '♡'}</Text></TouchableOpacity>
              </View>
              <View style={styles.progressArea}>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${duration ? position / duration * 100 : 0}%` }]} /></View>
                <View style={styles.timeRow}><Text style={styles.time}>{formatTime(position / 1000)}</Text><Text style={styles.time}>{formatTime(duration / 1000)}</Text></View>
              </View>
              <View style={styles.controls}>
                <TouchableOpacity onPress={() => setShuffle(v => !v)}><Text style={[styles.sideControl, shuffle && { color: C.purple }]}>⤨</Text></TouchableOpacity>
                <TouchableOpacity onPress={previousTrack}><Text style={styles.skip}>|◀</Text></TouchableOpacity>
                <TouchableOpacity onPress={togglePlay} style={styles.playButton}><Text style={styles.playGlyph}>{isPlaying ? 'Ⅱ' : '▶'}</Text></TouchableOpacity>
                <TouchableOpacity onPress={nextTrack}><Text style={styles.skip}>▶|</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setRepeat(v => !v)}><Text style={[styles.sideControl, repeat && { color: C.purple }]}>↻</Text></TouchableOpacity>
              </View>
              <View style={styles.playerFooter}><Text style={styles.sub}>▤ Очередь</Text><Text style={styles.sub}>⌁ Устройства</Text><Text style={styles.sub}>↗ Поделиться</Text></View>
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Section({ title, action }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Text style={styles.mutedSmall}>{action}</Text> : null}</View>;
}

function TrackRow({ track, index, active, onPress }) {
  return (
    <TouchableOpacity style={styles.trackRow} onPress={onPress}>
      <Artwork size={48} variant={index} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{track.artist}</Text>
      </View>
      <Text style={{ color: active ? C.purple : C.muted }}>{active ? '♫' : '•••'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  root: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
  glowOne: { position: 'absolute', width: 260, height: 260, borderRadius: 180, backgroundColor: '#543078', opacity: 0.18, top: 110, right: -120 },
  glowTwo: { position: 'absolute', width: 240, height: 240, borderRadius: 180, backgroundColor: '#292A69', opacity: 0.14, bottom: 90, left: -130 },
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 27, fontWeight: '900', letterSpacing: 5, color: C.text },
  tagline: { color: C.muted, fontSize: 8, letterSpacing: 2.5, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 21, paddingBottom: 145, flexGrow: 1 },
  eyebrow: { color: '#BFA1E8', fontSize: 9, letterSpacing: 2.2, fontWeight: '700' },
  eyebrowPurple: { color: '#D1B4FF', fontSize: 9, letterSpacing: 2, fontWeight: '800' },
  heroTitle: { color: C.text, fontSize: 30, fontWeight: '800', marginTop: 8 },
  sub: { color: C.muted, fontSize: 12, marginTop: 4 },
  banner: { borderRadius: 22, padding: 20, marginTop: 22, minHeight: 155, overflow: 'hidden', justifyContent: 'center' },
  bannerTitle: { color: C.text, fontSize: 23, fontWeight: '800', marginTop: 9, lineHeight: 28 },
  bannerOrb: { position: 'absolute', width: 112, height: 112, borderRadius: 60, right: 10, top: 22, backgroundColor: '#A17DC4', opacity: 0.55, borderWidth: 17, borderColor: '#D8C2FF', shadowColor: '#C49BFF', shadowOpacity: 0.8, shadowRadius: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 27, marginBottom: 11 },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  mutedSmall: { color: C.muted, fontSize: 10 },
  emptyCard: { backgroundColor: C.panel, borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  emptyIcon: { color: C.purple, fontSize: 30, marginBottom: 5 },
  trackTitle: { color: C.text, fontSize: 13, fontWeight: '700' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#FFFFFF0D' },
  art: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artOrb: { backgroundColor: '#120E19', borderWidth: 5, borderColor: '#C7A7E8', opacity: 0.92, shadowColor: '#E0C5FF', shadowOpacity: 1, shadowRadius: 15 },
  artRing: { position: 'absolute', borderWidth: 1, borderColor: '#FFFFFF55' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, backgroundColor: C.panel, borderRadius: 17, padding: 15, borderWidth: 1, borderColor: C.line },
  actionIcon: { color: C.purple, fontSize: 24, marginBottom: 10 },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 13, paddingBottom: Platform.OS === 'ios' ? 21 : 13, backgroundColor: '#100E15F2', borderTopWidth: 1, borderTopColor: C.line },
  navItem: { alignItems: 'center', gap: 3, minWidth: 60 },
  navIcon: { color: C.muted, fontSize: 21 },
  navLabel: { color: C.muted, fontSize: 9 },
  navActive: { color: C.purple },
  miniPlayer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 76 : 68, left: 12, right: 12, height: 66, backgroundColor: '#211C2AEF', borderWidth: 1, borderColor: '#FFFFFF20', borderRadius: 17, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  miniMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  miniControl: { width: 29, alignItems: 'center', justifyContent: 'center' },
  controlText: { color: C.text, fontSize: 18, fontWeight: '700' },
  fullPlayer: { ...StyleSheet.absoluteFillObject, zIndex: 20, backgroundColor: '#09090DF7', paddingHorizontal: 23, paddingTop: Platform.OS === 'ios' ? 8 : 20, paddingBottom: 18 },
  fullTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 55 },
  closeButton: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#FFFFFF10', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF16' },
  closeGlyph: { color: C.text, fontSize: 22 },
  fullTopTitle: { color: C.text, fontSize: 10, letterSpacing: 1.4, marginTop: 4, fontWeight: '700' },
  fullContent: { flex: 1, justifyContent: 'center', paddingBottom: 12 },
  bigArtworkWrap: { alignItems: 'center', marginBottom: 29 },
  songInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 25 },
  bigSongTitle: { color: C.text, fontSize: 22, fontWeight: '900' },
  heart: { color: C.purple, fontSize: 28, paddingHorizontal: 5 },
  progressArea: { marginBottom: 22 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: '#FFFFFF25', overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#D2B5FF', borderRadius: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { color: C.muted, fontSize: 10, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  sideControl: { color: '#A89FB3', fontSize: 22 },
  skip: { color: C.text, fontSize: 24, fontWeight: '600' },
  playButton: { width: 65, height: 65, borderRadius: 34, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', shadowColor: C.purple, shadowOpacity: 0.5, shadowRadius: 17 },
  playGlyph: { color: '#1A1222', fontSize: 25, fontWeight: '900' },
  playerFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FFFFFF12' },
  search: { marginTop: 18, marginBottom: 12, backgroundColor: C.panel, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, color: C.text, borderWidth: 1, borderColor: C.line },
  importButton: { backgroundColor: '#2A2037', borderRadius: 14, padding: 14, marginVertical: 12, borderWidth: 1, borderColor: '#6B4D8B' },
  importText: { color: '#DCC7FF', fontWeight: '700', textAlign: 'center' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#FFFFFF12', gap: 12 },
  serviceIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' },
  artistAvatar: { width:48,height:48,borderRadius:24,alignItems:'center',justifyContent:'center' },
  artistInitial: { color:'#F5EFFF',fontSize:20,fontWeight:'900' },
  artistHero: { alignItems:'center',paddingVertical:28,borderRadius:22,marginTop:12,borderWidth:1,borderColor:C.line },
  artistBigAvatar: { width:100,height:100,borderRadius:50,backgroundColor:'#8B68A8',alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:'#D8C0FF' },
  artistBigInitial: { color:'#FFFFFF',fontSize:42,fontWeight:'900' },
  artistName: { color:C.text,fontSize:25,fontWeight:'900',marginTop:15 },
  backButton: { paddingVertical:12 },
  noteCard: { backgroundColor:C.panel,borderRadius:16,padding:15,marginTop:20,borderWidth:1,borderColor:C.line }
});
