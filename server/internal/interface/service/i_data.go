package service

type IData interface {
	Put(key string, value any) error
	Get(key string, pv any) error
}
