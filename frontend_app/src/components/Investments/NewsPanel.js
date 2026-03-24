import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Image } from 'react-native';
import { Newspaper, ExternalLink, Image as ImageIcon } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { fetchNews } from '../../services/investmentService';

const NewsPanel = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNews()
            .then(data => setNews(data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading news...</Text>
            </View>
        );
    }

    if (!news.length) {
        return (
            <View style={styles.centerContainer}>
                <Newspaper size={40} color={colors.border} />
                <Text style={styles.emptyTitle}>No news available</Text>
            </View>
        );
    }

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.newsCard}
            onPress={() => item.link && Linking.openURL(item.link)}
            activeOpacity={0.9}
        >
            {/* Image Section */}
            {item.image || item.imageUrl ? (
                <Image source={{ uri: item.image || item.imageUrl }} style={styles.newsImage} resizeMode="cover" />
            ) : (
                <View style={styles.placeholderImage}>
                    <ImageIcon size={40} color={colors.gray400} />
                </View>
            )}

            {/* Content Section */}
            <View style={styles.contentContainer}>
                <View style={styles.newsHeader}>
                    <View style={styles.sourceBadge}>
                        <Text style={styles.sourceText}>{item.source}</Text>
                    </View>
                    <Text style={styles.dateText}>
                        {new Date(item.pubDate).toLocaleDateString()}
                    </Text>
                </View>

                <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.newsSummary} numberOfLines={3}>{item.summary}</Text>

                <View style={styles.readMoreContainer}>
                    <View style={styles.readMoreButton}>
                        <Text style={styles.readMoreText}>Read Article</Text>
                        <ExternalLink size={14} color={colors.primary} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <FlatList
            data={news}
            renderItem={renderItem}
            keyExtractor={(_, i) => String(i)}
            scrollEnabled={false}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    centerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    loadingText: { marginTop: 8, fontSize: fontSize.sm, color: colors.textSecondary },
    emptyTitle: { marginTop: 8, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
    list: { gap: spacing.md, paddingBottom: spacing.xl },
    newsCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    newsImage: {
        width: '100%',
        height: 160,
        backgroundColor: colors.gray100,
    },
    placeholderImage: {
        width: '100%',
        height: 160,
        backgroundColor: colors.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    contentContainer: {
        padding: spacing.md,
    },
    newsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sourceBadge: {
        backgroundColor: '#EBF2FC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    sourceText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    dateText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    newsTitle: {
        fontSize: 15,
        fontWeight: fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        textAlign: 'center',
        lineHeight: 22,
    },
    newsSummary: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    readMoreContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.surface,
        paddingTop: spacing.md,
        alignItems: 'center',
    },
    readMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    readMoreText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    },
});

export default NewsPanel;
