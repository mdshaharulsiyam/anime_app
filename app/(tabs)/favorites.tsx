import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui';
import { ScoreBadge } from '../../components/ui';
import { colors, font, radius, spacing } from '../../constants/theme';
import { FavoriteAnime, useFavorites } from '../../lib/favorites';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = spacing.lg;
const CARD_W = (SCREEN_W - GAP * 3) / 2;

function FavoriteCard({ item }: { item: FavoriteAnime }) {
  const { remove } = useFavorites();
  return (
    <Link href={`/anime/${item.mal_id}`} asChild>
      <Pressable style={{ width: CARD_W }}>
        <View style={[styles.posterWrap, { height: CARD_W * 1.45 }]}>
          <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
          <View style={styles.scoreFloat}>
            <ScoreBadge score={item.score} size="sm" />
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => remove(item.mal_id)}
            style={styles.removeBtn}
          >
            <Ionicons name="heart" size={16} color={colors.danger} />
          </Pressable>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[item.type, item.episodes ? `${item.episodes} eps` : null, item.year]
            .filter(Boolean)
            .join(' • ')}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { favorites, clear } = useFavorites();

  const confirmClear = () =>
    Alert.alert('Clear favorites?', 'This removes all saved anime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerWrap}>
        <View>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>
            {favorites.length} saved {favorites.length === 1 ? 'title' : 'titles'}
          </Text>
        </View>
        {favorites.length > 0 ? (
          <Pressable onPress={confirmClear} style={styles.clearBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        ) : null}
      </View>

      {favorites.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No favorites yet"
          message="Tap the heart on any anime to save it here."
        />
      ) : (
        <FlatList
          data={favorites}
          numColumns={2}
          keyExtractor={(item) => String(item.mal_id)}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: GAP }}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: GAP }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <FavoriteCard item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  subtitle: { color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  poster: { width: '100%', height: '100%' },
  cardTitle: {
    color: colors.text,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  scoreFloat: { position: 'absolute', left: 8, bottom: 8 },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
});
