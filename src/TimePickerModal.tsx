import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Platform,
    Dimensions
} from 'react-native';


// Ekran boyutuna göre duyarlı değer hesaplama (Kütüphane içinde kalması gerekir)
const getResponsiveValue = (baseValue: number): number => {
    const scaleFactor = width / 375;
    return baseValue * scaleFactor;
};


const { width } = Dimensions.get('window');

// Bileşen için prop tanımları
interface TimePickerModalProps {
    title: string;
    value: string; // Örn: "14:30"
    onTimeChange: (time: string) => void; // Onaylandığında çağrılır
    error?: string;
    placeholder?: string; // İsteğe bağlı
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({
    title,
    value,
    onTimeChange,
    error,
    placeholder = "00:00", // Varsayılan placeholder
}) => {
    const [visible, setVisible] = useState(false);

    // Responsive değerler
    const itemHeight:any = Platform.select({ ios: getResponsiveValue(40), android: getResponsiveValue(45) });
    const visibleItems = 5;

    // Saat ve dakika listelerini oluşturma
    const generateList = (type: "hour" | "minute"): string[] => {
        const max = type === "hour" ? 24 : 60;
        const list: string[] = [];

        for (let i = 0; i < max; i++) {
            list.push(i.toString().padStart(2, "0"));
        }

        return list;
    };

    const hours = useMemo(() => generateList("hour"), []);
    const minutes = useMemo(() => generateList("minute"), []);

    // Bileşenin kendi iç state'i (MobX yerine)
    const [selectedHour, setSelectedHour] = useState("00");
    const [selectedMinute, setSelectedMinute] = useState("00");

    const hourScrollViewRef = useRef<ScrollView>(null);
    const minuteScrollViewRef = useRef<ScrollView>(null);

    // Scroll durduğunda seçilen değeri belirler
    const handleMomentumScrollEnd = (event: any, type: "hour" | "minute") => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / itemHeight);
        const list = type === "hour" ? hours : minutes;

        let selectedValue = list[index];
        if (!selectedValue) {
            selectedValue = "00";
        }

        if (type === "hour") {
            setSelectedHour(selectedValue);
        } else {
            setSelectedMinute(selectedValue);
        }
    };

    // Modal açıldığında (visible değiştiğinde) mevcut değeri ayarlar ve scroll'u konumlandırır
    useEffect(() => {
        if (visible) {
            // Mevcut değeri al ve state'e set et
            const [hour, minute] = (value || "00:00").split(":");
            setSelectedHour(hour);
            setSelectedMinute(minute);

            // Scroll pozisyonlarını ayarla
            const scrollToPositions = () => {
                const hourIndex = hours.indexOf(hour);
                const minuteIndex = minutes.indexOf(minute);
                
                // Güvenli kontrol (index -1 ise 0'a çek)
                const finalHourIndex = hourIndex === -1 ? 0 : hourIndex;
                const finalMinuteIndex = minuteIndex === -1 ? 0 : minuteIndex;

                hourScrollViewRef.current?.scrollTo({
                    y: finalHourIndex * itemHeight,
                    animated: false
                });
                minuteScrollViewRef.current?.scrollTo({
                    y: finalMinuteIndex * itemHeight,
                    animated: false
                });
            };

            // ScrollView'in render edilmesini beklemek için timeout kullanıyoruz.
            const timeout = Platform.OS === 'android' ? 500 : 100;
            setTimeout(scrollToPositions, timeout);
        }
    }, [visible, value, hours, minutes, itemHeight]);

    // Onay butonu işleyicisi (En önemli değişiklik burada)
    const handleConfirm = () => {
        const time = `${selectedHour}:${selectedMinute}`;
        onTimeChange(time); // Dışarıdan gelen callback'i çağır
        setVisible(false);
    };

    const handleCancel = () => {
        setVisible(false);
    }
    
    // Android Scroll işleyicisi (momentum scroll end ile entegre)
    const handleScroll = (event: any, type: "hour" | "minute") => {
        if (Platform.OS === 'android') {
            // Android'de eğer onMomentumScrollEnd bazen çalışmazsa,
            // onScroll ile de scroll pozisyonunu yakalamak isteyebilirsiniz.
            // Ancak snapToInterval + onMomentumScrollEnd genellikle yeterlidir.
            // Orijinal kodunuzda olduğu gibi bırakıyorum:
            handleMomentumScrollEnd(event, type);
        }
    };

    return (
        <View style={styles.sectionContainer}>
            <View style={{ flexDirection: "row" }}>
                <Text style={styles.selectText}>{title}</Text>
                <Text style={[styles.selectText, { color: "red" }]}>{` *`}</Text>
            </View>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                activeOpacity={0.7}
            >
                <View style={styles.inputContainer}>
                    <Text style={[
                        styles.inputText,
                        !value && styles.placeholderText
                    ]}>
                        {value || placeholder}
                    </Text>
                    {error && <Text style={styles.errorText}>{error}</Text>}
                </View>
            </TouchableOpacity>
            <Modal
                visible={visible}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCancel}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={handleCancel} // Overlay'e tıklanınca kapatma
                >
                    <TouchableOpacity
                        style={styles.modalContentContainer}
                        activeOpacity={1} // İçeriğe tıklamayı engelle
                    >
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>{title}</Text>

                            <View style={styles.timePickerContainer}>
                                <View style={styles.selectionOverlay}>
                                    {/* itemHeight'i dinamik olarak verdik */}
                                    <View style={[styles.selectionLine, { height: itemHeight }]} />
                                </View>
                                <ScrollView
                                    ref={hourScrollViewRef}
                                    style={{ height: itemHeight * visibleItems, width: getResponsiveValue(60) }}
                                    snapToInterval={itemHeight}
                                    decelerationRate="fast"
                                    showsVerticalScrollIndicator={false}
                                    onMomentumScrollEnd={(event) => handleMomentumScrollEnd(event, "hour")}
                                    onScroll={(event) => handleScroll(event, "hour")}
                                    scrollEventThrottle={16}
                                >
                                    <View style={{ height: itemHeight * 2 }} />
                                    {hours.map((hour, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.timeOption,
                                                { height: itemHeight }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.timeText,
                                                hour === selectedHour && styles.selectedTimeText
                                            ]}>
                                                {hour}
                                            </Text>
                                        </View>
                                    ))}
                                    <View style={{ height: itemHeight * 2 }} />
                                </ScrollView>

                                <Text style={styles.timeSeparator}>:</Text>

                                <ScrollView
                                    ref={minuteScrollViewRef}
                                    style={{ height: itemHeight * visibleItems, width: getResponsiveValue(60) }}
                                    snapToInterval={itemHeight}
                                    decelerationRate="fast"
                                    showsVerticalScrollIndicator={false}
                                    onMomentumScrollEnd={(event) => handleMomentumScrollEnd(event, "minute")}
                                    onScroll={(event) => handleScroll(event, "minute")}
                                    scrollEventThrottle={16}
                                >
                                    <View style={{ height: itemHeight * 2 }} />
                                    {minutes.map((minute, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.timeOption,
                                                { height: itemHeight }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.timeText,
                                                minute === selectedMinute && styles.selectedTimeText
                                            ]}>
                                                {minute}
                                            </Text>
                                        </View>
                                    ))}
                                    <View style={{ height: itemHeight * 2 }} />
                                </ScrollView>
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    onPress={handleCancel}
                                    style={[styles.button, styles.cancelButton]}
                                >
                                    <Text style={styles.cancelButtonText}>İptal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleConfirm}
                                    style={[styles.button, styles.confirmButton]}
                                >
                                    <Text style={styles.confirmButtonText}>Onayla</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>

    );
};

export default TimePickerModal;

// Stil Tanımları
const styles = StyleSheet.create({
    sectionContainer: {
        marginVertical: getResponsiveValue(10),
    },
    selectText: {
        fontSize: getResponsiveValue(19),
        paddingBottom: getResponsiveValue(6),
        fontWeight: "bold",
        color: "#333",
    },
    inputContainer: {
        borderWidth: 1,
        borderColor: '#E8E8E8',
        borderRadius: getResponsiveValue(10),
        padding: getResponsiveValue(12),
        backgroundColor: 'white',
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            }
        }),
    },
    inputText: {
        fontSize: getResponsiveValue(16),
        color: '#505050',
    },
    placeholderText: {
        color: '#888',
    },
    errorText: {
        color: 'red',
        fontSize: getResponsiveValue(12),
        marginTop: getResponsiveValue(4),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContentContainer: {
        // Modalın içeriğine tıklandığında overlay'in kapanmasını engellemek için.
        // Sadece modalContainer boyutunda dokunma alanını korur.
        maxWidth: '90%', 
    },
    modalContainer: {
        backgroundColor: 'white',
        padding: getResponsiveValue(20),
        borderRadius: 8,
        width: getResponsiveValue(300),
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            }
        }),
    },
    modalTitle: {
        fontSize: getResponsiveValue(18),
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: getResponsiveValue(20),
        color: '#333',
    },
    timePickerContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: getResponsiveValue(20),
        position: 'relative', // selectionOverlay için
    },
    selectionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none', // Dokunma olaylarını engeller
    },
    selectionLine: {
        width: '80%', // ScrollView'leri kaplaması için
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#ddd',
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignSelf: 'center',
    },
    timeOption: {
        padding: getResponsiveValue(10),
        alignItems: "center",
        justifyContent: "center",
    },
    timeText: {
        fontSize: getResponsiveValue(16),
        color: "#2E3A59",
    },
    selectedTimeText: {
        color: "#3366FF",
        fontWeight: "bold",
    },
    timeSeparator: {
        fontSize: getResponsiveValue(24),
        marginHorizontal: getResponsiveValue(10),
        color: "#8F9BB3",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: getResponsiveValue(20),
    },
    button: {
        marginLeft: getResponsiveValue(10),
        paddingVertical: getResponsiveValue(10),
        paddingHorizontal: getResponsiveValue(20),
        borderRadius: 8,
        minWidth: getResponsiveValue(100),
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F7F7F7',
    },
    confirmButton: {
        backgroundColor: '#3366FF',
    },
    cancelButtonText: {
        color: '#2E3A59',
        fontSize: getResponsiveValue(16),
    },
    confirmButtonText: {
        color: 'white',
        fontSize: getResponsiveValue(16),
    },
});